/**
 * BellePoule Modern - Offline Queue Manager
 * Handles offline actions and synchronization when connection is restored
 * Licensed under GPL-3.0
 */

const DB_NAME = 'bellepoule-offline';
const DB_VERSION = 1;
const STORE_NAME = 'actions';

interface OfflineAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}

class OfflineQueue {
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  private onlineListeners: (() => void)[] = [];
  private discardListeners: ((action: OfflineAction) => void)[] = [];

  /** Vérifie qu'il reste de la place de stockage avant d'empiler (évite QuotaExceededError silencieux). */
  private async hasStorageRoom(): Promise<boolean> {
    if (!navigator.storage?.estimate) return true;
    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      return quota === 0 || usage < quota * 0.9;
    } catch {
      return true;
    }
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async addAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    if (!this.db) await this.init();

    if (!(await this.hasStorageRoom())) {
      throw new Error('offline-queue-full');
    }

    const fullAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(fullAction);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllActions(): Promise<OfflineAction[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeAction(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateAction(action: OfflineAction): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(action);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async sync(syncEndpoint: string): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress || !navigator.onLine) {
      return { success: 0, failed: 0 };
    }

    this.syncInProgress = true;
    const actions = await this.getAllActions();

    let success = 0;
    let failed = 0;

    for (const action of actions) {
      try {
        const response = await fetch(syncEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });

        if (response.ok) {
          await this.removeAction(action.id);
          success++;
        } else {
          if (action.retries >= 3) {
            await this.removeAction(action.id);
            failed++;
            // Abandon définitif : prévenir l'UI pour éviter une perte de donnée silencieuse
            this.discardListeners.forEach(cb => cb(action));
          } else {
            await this.updateAction({ ...action, retries: action.retries + 1 });
          }
        }
      } catch (error) {
        failed++;
      }
    }

    this.syncInProgress = false;
    return { success, failed };
  }

  /** Notifié quand une action est abandonnée après 3 échecs de synchronisation. */
  onActionDiscarded(callback: (action: OfflineAction) => void): void {
    this.discardListeners.push(callback);
  }

  onOnline(callback: () => void): void {
    this.onlineListeners.push(callback);
    window.addEventListener('online', callback);
  }

  onOffline(callback: () => void): void {
    window.addEventListener('offline', callback);
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  async getQueueSize(): Promise<number> {
    const actions = await this.getAllActions();
    return actions.length;
  }
}

export const offlineQueue = new OfflineQueue();

export async function queueScoreUpdate(
  arenaId: string,
  fencer: 'A' | 'B',
  points: number,
  zone?: string
): Promise<void> {
  await offlineQueue.addAction({
    type: 'score_update',
    payload: { arenaId, fencer, points, zone },
  });
}

export async function queueCard(
  arenaId: string,
  fencer: 'A' | 'B',
  cardType: string
): Promise<void> {
  await offlineQueue.addAction({
    type: 'card',
    payload: { arenaId, fencer, cardType },
  });
}

export async function queueArenaExit(
  arenaId: string,
  fencer: 'A' | 'B',
  isVoluntary: boolean
): Promise<void> {
  await offlineQueue.addAction({
    type: 'arena_exit',
    payload: { arenaId, fencer, isVoluntary },
  });
}

export async function syncOfflineActions(): Promise<void> {
  const result = await offlineQueue.sync('/api/sync');
  if (result.success > 0) {
    console.log(`Synchronisé ${result.success} actions hors-ligne`);
  }
  if (result.failed > 0) {
    console.warn(`${result.failed} actions échouées`);
  }
}
