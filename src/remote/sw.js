/**
 * BellePoule Modern - Service Worker for Offline Mode
 * Enables offline functionality for referee tablets
 * Licensed under GPL-3.0
 */

const CACHE_NAME = 'bellepoule-referee-v1';
const ASSETS = ['/', '/referee.html', '/arena.html', '/styles.css', '/app.js'];

const OFFLINE_QUEUE_DB = 'bellepoule-offline-queue';
const ACTIONS_STORE = 'actions';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_QUEUE_DB, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ACTIONS_STORE)) {
        db.createObjectStore(ACTIONS_STORE, { keyPath: 'id' });
      }
    };
  });
}

async function queueAction(action) {
  const db = await openDB();
  const tx = db.transaction(ACTIONS_STORE, 'readwrite');
  const store = tx.objectStore(ACTIONS_STORE);

  const queuedAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0,
  };

  store.add(queuedAction);
}

async function getQueuedActions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTIONS_STORE, 'readonly');
    const store = tx.objectStore(ACTIONS_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function removeAction(id) {
  const db = await openDB();
  const tx = db.transaction(ACTIONS_STORE, 'readwrite');
  const store = tx.objectStore(ACTIONS_STORE);
  store.delete(id);
}

async function syncScores() {
  const actions = await getQueuedActions();

  for (const action of actions) {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });

      if (response.ok) {
        await removeAction(action.id);
      } else if (action.retries >= 3) {
        await removeAction(action.id);
      }
    } catch {
      // Will retry on next sync
    }
  }
}

self.addEventListener('sync', event => {
  if (event.tag === 'sync-scores') {
    event.waitUntil(syncScores());
  }
});

self.addEventListener('message', event => {
  if (event.data?.type === 'QUEUE_ACTION') {
    queueAction({
      type: event.data.actionType,
      payload: event.data.payload,
    });
  }

  if (event.data?.type === 'SYNC_NOW') {
    syncScores();
  }
});
