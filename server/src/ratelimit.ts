/**
 * Простой in-memory лимитер запросов.
 *
 * API работает в одном инстансе (systemd moby-api), поэтому Map достаточно:
 * отдельная таблица/Redis здесь были бы лишней инфраструктурой. Окно скользящее,
 * ключи автоматически вычищаются, чтобы Map не рос бесконечно.
 */

const WINDOW_MS = 10 * 60 * 1000;

const attempts = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Сколько секунд ждать до следующей попытки (0, если попытка разрешена). */
  retryAfterSeconds: number;
}

/**
 * Регистрирует попытку и говорит, можно ли её выполнять.
 * Ключ должен включать область лимита (ip/phone/user), чтобы они не пересекались.
 */
export function checkRate(
  key: string,
  limit: number,
  windowMs: number = WINDOW_MS,
  now: number = Date.now(),
): RateLimitResult {
  const since = now - windowMs;
  const fresh = (attempts.get(key) ?? []).filter((at) => at > since);

  if (fresh.length >= limit) {
    const oldest = fresh[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    attempts.set(key, fresh);
    return { allowed: false, retryAfterSeconds };
  }

  fresh.push(now);
  attempts.set(key, fresh);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Сброс для юнит-тестов: продовый процесс чистит Map фоновым таймером. */
export function resetRateLimits(): void {
  attempts.clear();
}

const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, values] of attempts) {
    const fresh = values.filter((at) => at > now - WINDOW_MS);
    if (fresh.length === 0) {
      attempts.delete(key);
    } else {
      attempts.set(key, fresh);
    }
  }
}, 60_000);

// Таймер не должен удерживать event loop при остановке сервера.
sweeper.unref();
