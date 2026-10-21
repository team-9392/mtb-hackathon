import { Redirect } from "expo-router";
import React from "react";

/** Старый маршрут создания семьи. Пакет оформляется на шаге оплаты. */
export default function LegacyFamilyScreen() {
  return <Redirect href="/auth/payment" />;
}
