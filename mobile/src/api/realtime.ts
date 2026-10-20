import { useEffect, useRef } from "react";

import { accessTokenForSocket, refreshSession } from "./client";
import { API_URL, isApiConfigured } from "./config";

export interface RealtimeEvent {
  type?: string;
  at?: string;
  [key: string]: unknown;
}

/**
 * Живой канал семьи: сервер присылает событие, приложение перечитывает состояние.
 * Если токен протух, канал один раз обновляет сессию и переподключается.
 */
export function useRealtime(onEvent: () => void, enabled: boolean): void {
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!isApiConfigured || !enabled) {
      return;
    }
    let socket: WebSocket | null = null;
    let stopped = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      const token = await accessTokenForSocket();
      if (!token || stopped) {
        return;
      }
      socket = new WebSocket(`${API_URL.replace(/^http/, "ws")}/realtime?token=${encodeURIComponent(token)}`);
      socket.onopen = () => {
        attempt = 0;
      };
      socket.onmessage = (message) => {
        handler.current();
        void message;
      };
      socket.onclose = async (event) => {
        if (stopped) {
          return;
        }
        if (event.code === 4401) {
          await refreshSession();
        }
        attempt += 1;
        timer = setTimeout(() => void connect(), Math.min(15000, attempt * 1500));
      };
    };

    void connect();
    return () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
      socket?.close();
    };
  }, [enabled]);
}
