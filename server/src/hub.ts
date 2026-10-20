import type { SupabaseClient } from "@supabase/supabase-js";

export type Topic =
  | "access.granted"
  | "access.revoked"
  | "request.created"
  | "request.resolved"
  | "txn.created"
  | "limit.updated"
  | "permission.updated"
  | "quest.approved"
  | "quest.completed"
  | "card.blocked"
  | "card.unblocked"
  | "consent.signed";

interface Sink {
  send: (payload: string) => void;
}

/**
 * WebSocket-комнаты по семьям: второе устройство получает событие сразу,
 * как только первый что-то изменил. Событие дублируется в realtime_events,
 * чтобы устройство могло догнать пропущенное после обрыва связи.
 */
class Hub {
  private rooms = new Map<string, Set<Sink>>();

  join(familyId: string, socket: Sink): () => void {
    const room = this.rooms.get(familyId) ?? new Set<Sink>();
    room.add(socket);
    this.rooms.set(familyId, room);
    return () => {
      const current = this.rooms.get(familyId);
      if (!current) {
        return;
      }
      current.delete(socket);
      if (current.size === 0) {
        this.rooms.delete(familyId);
      }
    };
  }

  clients(familyId: string): number {
    return this.rooms.get(familyId)?.size ?? 0;
  }

  async publish(
    db: SupabaseClient,
    familyId: string,
    topic: Topic,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const { data } = await db
      .from("realtime_events")
      .insert({ family_id: familyId, topic, payload })
      .select("id")
      .single();

    const message = JSON.stringify({
      id: data?.id ?? null,
      topic,
      payload,
      at: new Date().toISOString(),
    });

    for (const sink of this.rooms.get(familyId) ?? []) {
      try {
        sink.send(message);
      } catch {
        // сокет уже закрыт — комната почистится на close
      }
    }
  }
}

export const hub = new Hub();
