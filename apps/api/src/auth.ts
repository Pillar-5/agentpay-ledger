import { createHash, randomBytes } from "node:crypto";
import type { Db } from "./db.js";

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function newRawKey(): string {
  return `ak_${randomBytes(24).toString("hex")}`;
}

export function verifyApiKey(db: Db, presented: string | undefined): boolean {
  if (!presented) return false;
  const h = hashKey(presented);
  const row = db
    .prepare("SELECT id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL")
    .get(h) as { id: string } | undefined;
  return Boolean(row);
}

export function ensureDevKey(db: Db): string | null {
  const existing = db.prepare("SELECT COUNT(*) AS n FROM api_keys WHERE revoked_at IS NULL").get() as { n: number };
  if (existing.n > 0) return null;
  const raw = newRawKey();
  db.prepare("INSERT INTO api_keys (id, key_hash, label, created_at, revoked_at) VALUES (?, ?, ?, ?, NULL)").run(
    `key_${Date.now()}`,
    hashKey(raw),
    "dev",
    new Date().toISOString()
  );
  return raw;
}
