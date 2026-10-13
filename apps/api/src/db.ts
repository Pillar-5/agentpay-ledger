import Database from "better-sqlite3";

export type Db = Database.Database;

let instance: Db | null = null;

export function openDatabase(path: string): Db {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function getDb(): Db {
  if (!instance) throw new Error("Database not initialized.");
  return instance;
}

export function setDb(db: Db): void {
  instance = db;
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
