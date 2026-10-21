import { Redirect } from "expo-router";
import React from "react";

/** Старый маршрут шага имени. Регистрация теперь идёт через /auth/parent-data. */
export default function LegacyNameScreen() {
  return <Redirect href="/auth/parent-data" />;
}
