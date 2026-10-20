import type { Env } from "./env.js";
import { sendTelegram, telegramEnabled } from "./telegram.js";

export interface SmsResult {
  sent: boolean;
  provider: string;
  error?: string;
}

/**
 * Отправка кода подтверждения.
 * telegram — бесплатно: код приходит в чат через бота (работает и в демо, и в проде);
 * twilio — реальная SMS на номер, платно (trial-кредит ~15$);
 * demo — код фиксированный из DEMO_OTP, наружу не уходит.
 */
export async function sendOtpSms(env: Env, phone: string, code: string): Promise<SmsResult> {
  const text = "Moby Family: код " + code + " для " + phone + ". Никому его не сообщайте.";

  // Telegram — основной бесплатный канал: и в демо, и с реальными кодами.
  if (telegramEnabled()) {
    const ok = await sendTelegram("🔐 " + text);
    if (ok) {
      return { sent: true, provider: "telegram" };
    }
  }

  try {
    if (env.SMS_PROVIDER === "twilio" && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM) {
      const auth = Buffer.from(env.TWILIO_ACCOUNT_SID + ":" + env.TWILIO_AUTH_TOKEN).toString("base64");
      const response = await fetch(
        "https://api.twilio.com/2010-04-01/Accounts/" + env.TWILIO_ACCOUNT_SID + "/Messages.json",
        {
          method: "POST",
          headers: {
            authorization: "Basic " + auth,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: phone, From: env.TWILIO_FROM, Body: text }),
        },
      );
      return response.ok
        ? { sent: true, provider: "twilio" }
        : { sent: false, provider: "twilio", error: "HTTP " + response.status };
    }
  } catch (error) {
    return { sent: false, provider: env.SMS_PROVIDER, error: (error as Error).message };
  }

  return { sent: false, provider: "demo" };
}
