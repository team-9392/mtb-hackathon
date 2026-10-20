import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Push через Expo Push API. Работает, когда у устройства есть токен:
 * на Android нужны FCM-ключи проекта, на iOS — APNs (платный Apple Developer).
 * Если токенов нет или провайдер не настроен — молча пропускаем, in-app уведомление уже создано.
 */
export async function sendPush(
  db: SupabaseClient,
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<void> {
  try {
    const { data: tokens } = await db.from("push_tokens").select("token").eq("user_id", userId);
    const messages = (tokens ?? [])
      .map((row) => row.token as string)
      .filter((token) => token.startsWith("ExponentPushToken"))
      .map((token) => ({ to: token, title, body, data, sound: "default" }));
    if (messages.length === 0) {
      return;
    }
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      console.error("[push] HTTP " + response.status);
    }
  } catch (error) {
    console.error("[push] ошибка: " + (error as Error).message);
  }
}
