import assert from "node:assert/strict";
import { test } from "node:test";

import { CONSENT_KINDS, consentFlags, consentViews } from "./consents.js";

test("GET consents отдаёт все четыре согласия, даже если строк нет", () => {
  const views = consentViews([]);
  assert.deepEqual(
    views.map((row) => row.kind),
    CONSENT_KINDS,
  );
  assert.ok(views.every((row) => row.granted === false && row.signed_at === null));
});

test("подписанные согласия помечаются granted и датой", () => {
  const signedAt = "2026-10-21T10:00:00.000Z";
  const views = consentViews([
    { kind: "legal", signed_at: signedAt, signed_by_user_id: "user-1" },
    { kind: "pd", signed_at: null },
  ]);
  const byKind = Object.fromEntries(views.map((row) => [row.kind, row]));
  assert.equal(byKind.legal?.granted, true);
  assert.equal(byKind.legal?.signed_at, signedAt);
  assert.equal(byKind.legal?.signed_by_user_id, "user-1");
  assert.equal(byKind.pd?.granted, false);
  assert.equal(byKind.access?.granted, false);
  assert.equal(byKind.written14?.granted, false);
  assert.deepEqual(consentFlags([{ kind: "legal", signed_at: signedAt }]), {
    legal: true,
    pd: false,
    access: false,
    written14: false,
  });
});
