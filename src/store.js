import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { encrypt, decrypt } from './security.js';

export class Store {
  constructor(config, filename = join(config.dataDir, 'voice.sqlite')) {
    this.key = config.dataKey;
    mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(filename);
    if (filename !== ':memory:') chmodSync(filename, 0o600);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS records (scope TEXT, id TEXT, value TEXT NOT NULL, expires INTEGER NOT NULL, PRIMARY KEY(scope,id));
      CREATE TABLE IF NOT EXISTS usage (day TEXT, kind TEXT, count INTEGER NOT NULL, PRIMARY KEY(day,kind));`);
    this.cleanup();
  }
  get(scope, id) {
    const row = this.db.prepare('SELECT value, expires FROM records WHERE scope=? AND id=?').get(scope, id);
    if (!row || row.expires <= Date.now()) { this.delete(scope, id); return null; }
    return decrypt(row.value, this.key);
  }
  set(scope, id, value, ttl = 86400) {
    this.db.prepare('INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(scope,id) DO UPDATE SET value=excluded.value, expires=excluded.expires').run(scope, id, encrypt(value, this.key), Date.now() + ttl * 1000);
  }
  delete(scope, id) { this.db.prepare('DELETE FROM records WHERE scope=? AND id=?').run(scope, id); }
  clearOwner(owner) {
    this.db.prepare('DELETE FROM records WHERE id=? OR id LIKE ?').run(owner, owner + ':%');
  }
  consume(kind, limit, day = new Date().toISOString().slice(0, 10)) {
    const row = this.db.prepare(`INSERT INTO usage(day,kind,count) VALUES(?,?,1)
      ON CONFLICT(day,kind) DO UPDATE SET count=count+1 WHERE count < ? RETURNING count`).get(day, kind, limit);
    return Boolean(row);
  }
  usage() { return this.db.prepare('SELECT kind,count FROM usage WHERE day=?').all(new Date().toISOString().slice(0, 10)); }
  list(scope) {
    return this.db.prepare('SELECT id,value FROM records WHERE scope=? AND expires>? LIMIT 20').all(scope, Date.now()).map(row => ({ id: row.id, ...decrypt(row.value, this.key) }));
  }
  cleanup() {
    this.db.prepare('DELETE FROM records WHERE expires<=?').run(Date.now());
    this.db.prepare('DELETE FROM usage WHERE day<?').run(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  }
  close() { this.db.close(); }
}
