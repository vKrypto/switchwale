// SW_VERSION is stamped by the deploy pipeline (see deploy.yml) with the
// commit SHA on every build. That byte-diff is what makes the browser
// recognize a new service worker and go through install/activate instead
// of keeping the previously-installed one running forever.
const SW_VERSION = '__SW_VERSION__';
const API_BASE_URL = '__SW_API_BASE_URL__';
const TENANT_NAME = 'switchwale.com';
const DB_NAME = 'switchwala_events';
const STORE_NAME = 'queue';
const CACHE_PREFIX = 'switchwala-cache-';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // No asset caching yet — this only clears out caches from older SW
  // versions so nothing outlives the deploy that created it.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_PREFIX + SW_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readQueueSnapshot() {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const items = [];
        const req = tx.objectStore(STORE_NAME).openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            items.push({ key: cursor.primaryKey, value: cursor.value });
            cursor.continue();
          } else {
            resolve(items);
          }
        };
        req.onerror = () => reject(req.error);
      })
  );
}

function removeFromQueue(keys) {
  if (keys.length === 0) return Promise.resolve();
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        keys.forEach((key) => store.delete(key));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

// Same batch flush as the main-thread interval in src/lib/events.ts, but
// triggered by the browser's Background Sync instead of a timer — this is
// the safety net for events queued right before the tab got closed.
// Leaving a failure unhandled (no catch) lets the browser's own Background
// Sync retry/backoff pick it back up; we don't reimplement that here.
function flushQueue() {
  return readQueueSnapshot().then((snapshot) => {
    if (snapshot.length === 0) return;
    const sessionId = snapshot[0].value.sessionId;
    const events = snapshot.map((item) => item.value.event);
    return fetch(`${API_BASE_URL}/add-events`, {
      method: 'POST',
      headers: {
        tenant_name: TENANT_NAME,
        session_id: sessionId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    }).then((res) => {
      if (!res.ok) throw new Error(`add-events failed: ${res.status}`);
      return removeFromQueue(snapshot.map((item) => item.key));
    });
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-events') {
    event.waitUntil(flushQueue());
  }
});
