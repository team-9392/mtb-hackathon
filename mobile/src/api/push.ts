import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { registerPushTokenApi } from "./actions";

/**
 * Push нужен, чтобы запрос ребёнка дошёл до родителя, даже когда приложение закрыто.
 *
 * iOS отключён осознанно: push там требует Apple Developer Program (платный аккаунт),
 * без него Xcode не подписывает сборку с entitlement aps-environment.
 * На iOS те же события приходят в Telegram и в ленту внутри приложения.
 */
export async function registerPush(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") {
      return;
    }

    const projectId =
      (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) {
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (token) {
      await registerPushTokenApi(token, Platform.OS);
    }
  } catch {
    // Без настроенных FCM-ключей пуши просто не включатся – остальные каналы работают.
  }
}
