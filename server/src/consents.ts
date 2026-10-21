import type { ConsentId } from "./rules.js";

/**
 * Согласия ребёнка. В базе лежат только подписанные строки, поэтому список
 * для экрана всегда собираем целиком: отсутствует строка — согласие не выдано.
 */
export const CONSENT_KINDS: ConsentId[] = ["legal", "pd", "access", "written14"];

export interface ConsentRow {
  kind: string;
  signed_at: string | null;
  signed_by_user_id?: string | null;
}

export interface ConsentView {
  kind: ConsentId;
  granted: boolean;
  signed_at: string | null;
  signed_by_user_id: string | null;
}

export function consentViews(rows: ConsentRow[] | null | undefined): ConsentView[] {
  const byKind = new Map((rows ?? []).map((row) => [row.kind, row]));
  return CONSENT_KINDS.map((kind) => {
    const row = byKind.get(kind);
    return {
      kind,
      granted: Boolean(row?.signed_at),
      signed_at: row?.signed_at ?? null,
      signed_by_user_id: row?.signed_by_user_id ?? null,
    };
  });
}

/** Флаги для снапшота /family: { legal: true, pd: false, ... }. */
export function consentFlags(rows: ConsentRow[] | null | undefined): Record<ConsentId, boolean> {
  return consentViews(rows).reduce(
    (acc, row) => {
      acc[row.kind] = row.granted;
      return acc;
    },
    {} as Record<ConsentId, boolean>,
  );
}
