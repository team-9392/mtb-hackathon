import type { PaymentMethod } from "./draft";

/**
 * Оплата пакета «Фэмили».
 *
 * Серверного эндпоинта оплаты пока нет, поэтому подтверждение имитируется
 * на устройстве: задержка 1,2 с, как у банковского шлюза, и локальный номер
 * платежа для чека. Когда появится реальный POST (например /payments/package),
 * меняется только тело payPackage — экран оплаты и чек останутся прежними.
 */

export const PACKAGE_PAYMENT_DELAY_MS = 1200;

export interface PackagePaymentInput {
  amount: number;
  method: PaymentMethod;
  description: string;
}

export interface PackagePaymentResult {
  paymentId: string;
  paidAt: string;
  amount: number;
  method: PaymentMethod;
  status: "paid";
}

function makePaymentId(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const random = Math.random().toString(36).toUpperCase().slice(2, 5);
  return "MF-" + stamp + "-" + random;
}

/**
 * Локальное подтверждение оплаты.
 * Структура результата совпадает с тем, что вернёт реальный шлюз:
 * номер платежа, время, сумма и статус.
 */
export async function payPackage(input: PackagePaymentInput): Promise<PackagePaymentResult> {
  if (!(input.amount > 0)) {
    throw new Error("Сумма платежа должна быть больше нуля");
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, PACKAGE_PAYMENT_DELAY_MS);
  });
  return {
    paymentId: makePaymentId(),
    paidAt: new Date().toISOString(),
    amount: input.amount,
    method: input.method,
    status: "paid",
  };
}
