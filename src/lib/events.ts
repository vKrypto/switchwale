// Main-thread role, and nothing more: addEvent() writes a record into
// IndexedDB and asks the service worker for a background sync. All network
// delivery (batching, retry, /add-events) lives in public/service-worker.js
// — this file never calls fetch.

const DB_NAME = 'switchwala_events';
const STORE_NAME = 'queue';
const SESSION_ID_KEY = 'switchwala_session_id';

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

// sessionId travels with the record (not just as a header) because the
// service worker's sync-triggered flush has no access to localStorage.
type StoredRecord = {
  sessionId: string;
  event: QueuedEvent;
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

// getSessionId() → 32-char hex string, cached in localStorage across visits
function getSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, '');
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

async function enqueue(record: StoredRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

interface SyncManager {
  register(tag: string): Promise<void>;
}
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: SyncManager;
}

let swRegistration: ServiceWorkerRegistration | undefined;

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('/service-worker.js');
  } catch {
    // unsupported/blocked — events still queue in IndexedDB, waiting for a SW
  }
}

// Wakes the SW to flush the queue. On browsers without Background Sync
// support (e.g. Safari), this is a no-op and queued events only go out the
// next time the SW happens to receive some other event.
async function requestBackgroundSync(): Promise<void> {
  if (!swRegistration || !('sync' in swRegistration)) return;
  try {
    await (swRegistration as ServiceWorkerRegistrationWithSync).sync.register('flush-events');
  } catch {
    // Background Sync registration rejected — nothing else to fall back to here
  }
}

// addEvent('lead_generation', 'contact_form_submit', 1, { email: 'a@b.com' }) → queues it in IndexedDB
export async function addEvent(
  eventType: string,
  eventName: string,
  eventValue: number,
  data: Record<string, unknown> = {},
  userId = '',
): Promise<void> {
  await enqueue({
    sessionId: getSessionId(),
    event: {
      event_type: eventType,
      event_name: eventName,
      event_value: eventValue,
      data,
      user_id: userId,
      user_info: {},
      browser_info: collectBrowserInfo(),
      send_time: microsecondTimestamp(),
    },
  });
  void requestBackgroundSync();
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
  void registerServiceWorker();

  trackPageVisit();
  window.addEventListener('scroll', trackScrollDebounced, { passive: true });
  document.addEventListener('click', handleDocumentClick);
}
