import { Injectable } from '@angular/core';

export type OfflineStore = 'cache' | 'collections' | 'queue' | 'kv';

interface DbRecord {
  key: string;
  value: unknown;
  ts: number;
}

const DB_NAME = 'junta-agua-offline';
const DB_VERSION = 1;
const STORES: OfflineStore[] = ['cache', 'collections', 'queue', 'kv'];

/**
 * Wrapper genérico sobre IndexedDB para persistir la réplica offline.
 * Si IndexedDB no está disponible, degrada a un Map en memoria (efímero).
 */
@Injectable({ providedIn: 'root' })
export class OfflineStorageService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private useMemory = false;
  private memory = new Map<string, Map<string, DbRecord>>();

  private async db(): Promise<IDBDatabase> {
    if (this.useMemory) throw new Error('usando memoria');
    if (typeof indexedDB === 'undefined') {
      this.useMemory = true;
      throw new Error('usando memoria');
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          for (const name of STORES) {
            if (!req.result.objectStoreNames.contains(name)) {
              req.result.createObjectStore(name, { keyPath: 'key' });
            }
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }).catch((): IDBDatabase | null => null);
    }
    const p = await this.dbPromise;
    if (!p) {
      this.useMemory = true;
      throw new Error('usando memoria');
    }
    return p;
  }

  async get<T>(store: OfflineStore, key: string): Promise<T | undefined> {
    try {
      return await this.idbGet<T>(store, key);
    } catch {
      return this.memGet<T>(store, key);
    }
  }

  async set(store: OfflineStore, key: string, value: unknown): Promise<void> {
    try {
      await this.idbSet(store, key, value);
    } catch {
      this.memSet(store, key, value);
    }
  }

  async remove(store: OfflineStore, key: string): Promise<void> {
    try {
      await this.idbRemove(store, key);
    } catch {
      this.memRemove(store, key);
    }
  }

  async all<T>(store: OfflineStore): Promise<T[]> {
    try {
      return await this.idbAll<T>(store);
    } catch {
      return this.memAll<T>(store);
    }
  }

  async entries(store: OfflineStore): Promise<DbRecord[]> {
    try {
      return await this.idbEntries(store);
    } catch {
      return this.memEntries(store);
    }
  }

  async clearStore(store: OfflineStore): Promise<void> {
    try {
      await this.idbClear(store);
    } catch {
      this.memClear(store);
    }
  }

  // ===== IndexedDB =====
  private idbGet<T>(store: OfflineStore, key: string): Promise<T | undefined> {
    return this.db().then(
      (db) =>
        new Promise<T | undefined>((resolve, reject) => {
          const req = db.transaction(store, 'readonly').objectStore(store).get(key);
          req.onsuccess = () => resolve((req.result as DbRecord | undefined)?.value as T);
          req.onerror = () => reject(req.error);
        }),
    );
  }

  private idbSet(store: OfflineStore, key: string, value: unknown): Promise<void> {
    return this.db().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const os = db.transaction(store, 'readwrite').objectStore(store);
          const record: DbRecord = { key, value, ts: Date.now() };
          const req = os.put(record);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
    );
  }

  private idbRemove(store: OfflineStore, key: string): Promise<void> {
    return this.db().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
    );
  }

  private idbAll<T>(store: OfflineStore): Promise<T[]> {
    return this.db().then(
      (db) =>
        new Promise<T[]>((resolve, reject) => {
          const req = db.transaction(store, 'readonly').objectStore(store).getAll();
          req.onsuccess = () => resolve((req.result as DbRecord[]).map((r) => r.value as T));
          req.onerror = () => reject(req.error);
        }),
    );
  }

  private idbEntries(store: OfflineStore): Promise<DbRecord[]> {
    return this.db().then(
      (db) =>
        new Promise<DbRecord[]>((resolve, reject) => {
          const req = db.transaction(store, 'readonly').objectStore(store).getAll();
          req.onsuccess = () => resolve(req.result as DbRecord[]);
          req.onerror = () => reject(req.error);
        }),
    );
  }

  private idbClear(store: OfflineStore): Promise<void> {
    return this.db().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const req = db.transaction(store, 'readwrite').objectStore(store).clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        }),
    );
  }

  // ===== Memoria (fallback) =====
  private memStore(store: OfflineStore): Map<string, DbRecord> {
    let m = this.memory.get(store);
    if (!m) {
      m = new Map();
      this.memory.set(store, m);
    }
    return m;
  }

  private memGet<T>(store: OfflineStore, key: string): T | undefined {
    return this.memStore(store).get(key)?.value as T | undefined;
  }

  private memSet(store: OfflineStore, key: string, value: unknown): void {
    this.memStore(store).set(key, { key, value, ts: Date.now() });
  }

  private memRemove(store: OfflineStore, key: string): void {
    this.memStore(store).delete(key);
  }

  private memAll<T>(store: OfflineStore): T[] {
    return [...this.memStore(store).values()].map((r) => r.value as T);
  }

  private memEntries(store: OfflineStore): DbRecord[] {
    return [...this.memStore(store).values()];
  }

  private memClear(store: OfflineStore): void {
    this.memStore(store).clear();
  }
}
