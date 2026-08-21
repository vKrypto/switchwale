// Offline-resilient event tracking: addEvent() buffers into IndexedDB,
// a 10s interval (+ 'online' listener) bulk-flushes the queue to /add-events.
// Deletion targets each record's own IndexedDB auto-increment key, so
// events added mid-flush (new keys) are never touched by that flush.
// A failed flush (3 attempts, all failed) pauses further flushing for 5min.

const DB_NAME = 'switchwala_events';
const STORE_NAME = 'queue';
const TENANT_NAME = 'switchwale.com';
const SESSION_ID_KEY = 'switchwala_session_id';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-id.execute-api.us-east-1.amazonaws.com/dev';
const FLUSH_INTERVAL_MS = 10_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;
const PAUSE_AFTER_FAILURE_MS = 5 * 60 * 1000;

type QueuedEvent = {
  event_type: string;
  event_name: string;
  event_value: number;
  data: Record<string, unknown>;
  user_id: string;
  user_info: Record<string, unknown>;
  browser_info: Record<string, unknown>;
  send_time: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

// microsecondTimestamp() → "2026-08-22T10:15:30.123000Z" (backend expects 6 fractional digits)
function microsecondTimestamp(): string {
  return new Date().toISOString().replace(/\.(\d{3})Z$/, '.$1000Z');
}

function collectBrowserInfo(): Record<string, unknown> {
  return {
    user_agent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen_width: screen.width,
    screen_height: screen.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document.referrer,
    url: window.location.href,
  };
}

async function enqueue(event: QueuedEvent): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(event);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readQueueSnapshot(): Promise<{ key: IDBValidKey; value: QueuedEvent }[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const items: { key: IDBValidKey; value: QueuedEvent }[] = [];
    const req = tx.objectStore(STORE_NAME).openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        items.push({ key: cursor.primaryKey, value: cursor.value as QueuedEvent });
        cursor.continue();
      } else {
        resolve(items);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

async function removeFromQueue(keys: IDBValidKey[]): Promise<void> {
  if (keys.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    keys.forEach((key) => store.delete(key));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// postEvents([e1, e2]) → true once /add-events returns 2xx, false after 3 failed attempts
async function postEvents(events: QueuedEvent[]): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${API_BASE_URL}/add-events`, {
        method: 'POST',
        headers: {
          tenant_name: TENANT_NAME,
          session_id: getSessionId(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });
      if (res.ok) return true;
    } catch {
      // offline or network failure — fall through to retry/backoff
    }
    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  return false;
}

let flushing = false;
let pausedUntil = 0;

async function flushQueue(): Promise<void> {
  if (flushing || Date.now() < pausedUntil) return;
  flushing = true;
  try {
    const snapshot = await readQueueSnapshot();
    if (snapshot.length === 0) return;
    const ok = await postEvents(snapshot.map((item) => item.value));
    if (ok) {
      await removeFromQueue(snapshot.map((item) => item.key));
    } else {
      pausedUntil = Date.now() + PAUSE_AFTER_FAILURE_MS;
    }
  } finally {
    flushing = false;
  }
}

// addEvent('lead_generation', 'contact_form_submit', 1, { email: 'a@b.com' }) → queues it, flushed within 10s
export async function addEvent(
  eventType: string,
  eventName: string,
  eventValue: number,
  data: Record<string, unknown> = {},
  userId = '',
): Promise<void> {
  await enqueue({
    event_type: eventType,
    event_name: eventName,
    event_value: eventValue,
    data,
    user_id: userId,
    user_info: {},
    browser_info: collectBrowserInfo(),
    send_time: microsecondTimestamp(),
  });
}

// getElementXPath(buttonEl) → '//*[@id="submit"]' or '/body[1]/main[1]/button[2]'
function getElementXPath(el: Element): string {
  if (el.id) return `//*[@id="${el.id}"]`;
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== document.documentElement) {
    let index = 1;
    let sibling = node.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === node.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    parts.unshift(`${node.tagName.toLowerCase()}[${index}]`);
    node = node.parentElement;
  }
  return '/' + parts.join('/');
}

// scrollDepthFraction() → 0 (top) .. 1 (bottom); 1 when the page doesn't scroll at all
function scrollDepthFraction(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
}

function trackPageVisit(): void {
  void addEvent('monitor', 'page_visit', 1, {
    current_path: window.location.pathname,
    query_params: Object.fromEntries(new URLSearchParams(window.location.search)),
  });
}

function trackScroll(): void {
  void addEvent('monitor', 'scroll', scrollDepthFraction(), {
    current_location: window.location.pathname,
  });
}

let scrollDebounceTimer: ReturnType<typeof setTimeout> | undefined;
function trackScrollDebounced(): void {
  clearTimeout(scrollDebounceTimer);
  scrollDebounceTimer = setTimeout(trackScroll, 300);
}

function trackClick(el: Element): void {
  void addEvent('monitor', 'click', 1, { elementXPath: getElementXPath(el) });
}

function trackHrefClick(anchor: HTMLAnchorElement): void {
  void addEvent('monitor', 'href_click', 1, {
    current_path: window.location.pathname,
    link_path: anchor.getAttribute('href') ?? '',
  });
}

function handleDocumentClick(event: MouseEvent): void {
  const target = event.target as Element | null;
  if (!target) return;
  const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
  if (anchor) trackHrefClick(anchor);
  trackClick(target);
}

if (typeof window !== 'undefined') {
  setInterval(flushQueue, FLUSH_INTERVAL_MS);
  window.addEventListener('online', flushQueue);

  trackPageVisit();
  window.addEventListener('scroll', trackScrollDebounced, { passive: true });
  document.addEventListener('click', handleDocumentClick);
}
