import { render } from 'preact';
import { Widget, inkOn, type Payload } from './app';
import { css } from './css';

type BootOpts = {
  key: string; token?: string;
  user?: { email?: string; name?: string };
  api?: string; hideLauncher?: boolean;
  onOpen?: () => void; onClose?: () => void; onTokenExpired?: () => void;
};

const REF_PARAM = 'stk_ref';
const REF_STORE = 'stk.ref';

let host: HTMLDivElement | null = null;
let root: ShadowRoot | null = null;
let opts: BootOpts | null = null;
let payload: Payload | null = null;
let open = false;
let anonId = '';
/** Once per page load; a warning on every repaint is just noise. */
let warnedLauncher = false;

// Default to the CDN, not the app: w.js and the config endpoint are cached there.
const api = () => opts?.api ?? 'https://cdn.stickly.live';

/** Catch ?stk_ref on any page the script loads on — including the marketing site,
 *  which is where most referral clicks actually land. */
function captureRef() {
  try {
    const v = new URLSearchParams(location.search).get(REF_PARAM);
    if (v) localStorage.setItem(REF_STORE, v);
  } catch { /* private mode, blocked storage — attribution is best-effort */ }
}

function getAnon() {
  try {
    let v = localStorage.getItem('stk.anon');
    if (!v) { v = 'anon_' + Math.random().toString(36).slice(2, 11); localStorage.setItem('stk.anon', v); }
    return v;
  } catch { return 'anon_' + Math.random().toString(36).slice(2, 11); }
}

/**
 * Analytics events. `fetch(..., { keepalive: true })`, never `sendBeacon`.
 *
 * This used sendBeacon and NOT ONE event ever arrived from a real install.
 * sendBeacon always sends with credentials mode "include", and the body was a
 * Blob typed application/json, which is not a CORS-safelisted content type — so
 * the browser preflights it, and the preflight is refused outright because our
 * reply carries `Access-Control-Allow-Origin: *`, which a credentialed request
 * may not accept. Verified in a browser against the live endpoint:
 *
 *   beacon(Blob application/json)      preflight blocked
 *   fetch(keepalive, content-type json) 204
 *
 * The old code then ignored sendBeacon's return value, so the fetch fallback
 * underneath it never ran either. Nothing logged, nothing threw, and the
 * Integrate screen told every customer their script had never loaded while
 * their users were claiming rewards through it.
 *
 * fetch defaults to credentials "same-origin", so cross-origin it sends no
 * cookies and `*` is accepted. `keepalive` is what sendBeacon was here for:
 * the request outlives the page.
 */
function track(type: string, taskId?: string) {
  if (!opts) return;
  fetch(`${api()}/api/w/event`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: opts.key, type, taskId }),
    keepalive: true,
  }).catch(() => {});
}

async function claim(taskId: string, proof?: { url?: string; image?: string }) {
  if (!opts) return false;
  try {
    const res = await fetch(`${api()}/api/w/claim`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        key: opts.key, token: opts.token, taskId, anonId,
        proofUrl: proof?.url, proofImage: proof?.image,
      }),
    });
    if (res.status === 401) opts.onTokenExpired?.();
    return res.ok;
  } catch { return false; }
}

/**
 * Where the shadow host goes.
 *
 * `inline` mounts inside an element the host page already lays out, so the card
 * must not be `position: fixed` — that is what `data-inline` on the shadow root
 * switches off. Everything else hangs off <body> and floats.
 *
 * If the selector matches nothing we fall back to floating rather than
 * rendering into nowhere: a widget that is invisible because a container was
 * renamed is the single hardest failure for a customer to diagnose, and there
 * is no error anywhere to find.
 */
function inlineTarget(): HTMLElement | null {
  if (payload?.config.displayMode !== 'inline') return null;
  const sel = payload.config.inlineSelector || '[data-stickly-inline]';
  try { return document.querySelector(sel); } catch { return null; }
}

function mount() {
  if (host) return;
  host = document.createElement('div');
  host.setAttribute('data-stickly', '');
  // Shadow DOM: the host page's CSS cannot reach in, and ours cannot reach out.
  root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;
  root.appendChild(style);
  const slot = document.createElement('div');

  const target = inlineTarget();
  if (target) {
    slot.setAttribute('data-inline', '');
    host.style.display = 'block';
    target.appendChild(host);
  } else {
    document.body.appendChild(host);
  }
  root.appendChild(slot);
}

function paint() {
  if (!root || !payload) return;
  const slot = root.lastChild as HTMLElement;
  const mode = payload.config.displayMode ?? 'floating';
  const isInline = slot.hasAttribute('data-inline');

  // Inline is always on screen: there is nothing to open or close, and no
  // launcher, because the host page already gave it a place to sit.
  if (isInline) {
    return render(
      <Widget payload={payload} onTrack={track}
        onClose={() => {}} hideClose
        onClaim={(t, proof) => claim(t.id, proof)} />, slot);
  }

  if (!open) {
    // `popup` deliberately draws nothing until the host calls stk.open() — it
    // is for products that already have their own "Earn credits" menu item and
    // do not want a second floating button next to it.
    //
    // `hideLauncher` is a per-page escape hatch and it wins, which is the usual
    // contract for an embedded widget. But it wins SILENTLY, and that cost a
    // real afternoon: a founder flips Display to "Floating button", publishes,
    // nothing appears, and there is no signal anywhere that one line in their
    // own code is overriding the dashboard. So when the two disagree, say so
    // where the person who wrote that line will see it.
    if (opts?.hideLauncher && mode === 'floating') {
      if (!warnedLauncher) {
        warnedLauncher = true;
        console.warn(
          '[stickly] This workspace is set to "Floating button", but boot() was '
          + 'called with hideLauncher: true, so no launcher is drawn. Remove '
          + 'hideLauncher to let the dashboard setting apply, or switch the '
          + 'workspace to "Popup only" so the setting matches the code.',
        );
      }
      return render(null, slot);
    }
    if (opts?.hideLauncher || mode === 'popup') return render(null, slot);
    return render(
      <button class="stk-launch"
        style={{ '--accent': payload.config.accentColor,
                 '--accent-ink': inkOn(payload.config.accentColor) } as never}
        onClick={() => api$open()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 7h-1.7a3 3 0 0 0-4.3-4L12 5l-2-2a3 3 0 0 0-4.3 4H4a2 2 0 0 0-2 2v2h20V9a2 2 0 0 0-2-2M3 13v7a2 2 0 0 0 2 2h6v-9zm10 0v9h6a2 2 0 0 0 2-2v-7z" />
        </svg>
        {payload.config.launcherLabel || 'Earn credits'}
      </button>, slot);
  }

  // The scrim is a SIBLING of the card, not a wrapper around it: the card is
  // position: fixed, and wrapping it in a positioned parent changes what its
  // centring resolves against.
  render(
    <>
      {payload.config.position === 'center' && (
        <div class="stk-scrim" onClick={() => api$close()} />
      )}
      <Widget payload={payload} onTrack={track}
        onClose={() => api$close()}
        onClaim={(t, proof) => claim(t.id, proof)} />
    </>, slot);
}

/**
 * Escape closes a centred card: a dimmed page that will not dismiss with the key
 * everyone reaches for reads as a hang. A corner card is not modal, so it must
 * not swallow the host page's own Escape handling — hence the check.
 *
 * That check is inside the handler rather than at bind time on purpose. The host
 * may call stk.open() from their own menu before boot() has finished fetching
 * the config, which is exactly what the demo page does, and then `payload` is
 * still null — deciding at bind time silently never bound the listener at all.
 */
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && payload?.config.position === 'center') api$close();
}

function api$open() {
  open = true;
  opts?.onOpen?.();
  document.addEventListener('keydown', onKey);
  track('modal_opened');
  paint();
}
function api$close() {
  open = false;
  document.removeEventListener('keydown', onKey);
  opts?.onClose?.();
  paint();
}

async function boot(o: BootOpts) {
  opts = o;
  anonId = getAnon();
  captureRef();

  const res = await fetch(`${api()}/api/w/${encodeURIComponent(o.key)}`);
  if (!res.ok) return;
  const p = (await res.json()) as Payload;
  if (!p.enabled || !p.tasks?.length) return;   // expired plan: no-op, nothing breaks

  payload = p;
  mount();
  track('widget_viewed');
  paint();
}

function shutdown() {
  // Without this, the next user on a shared machine inherits the last one's widget.
  host?.remove();
  host = null; root = null; opts = null; payload = null; open = false;
  warnedLauncher = false;
}

const sdk = {
  boot, shutdown,
  open: api$open, close: api$close,
  show: () => { if (host) host.style.display = ''; },
  hide: () => { if (host) host.style.display = 'none'; },
  updateToken: (t: string) => { if (opts) opts.token = t; },
  getRef: () => { try { return localStorage.getItem(REF_STORE); } catch { return null; } },
};

type Fn = (s: typeof sdk) => void;
/** Before this script loads `cmd` is a plain array the host pushed into;
 *  afterwards it is a shim that runs callbacks immediately. Both have .push. */
type Queue = { cmd?: Fn[] | { push(f: Fn): void } };
const w = window as unknown as { stk?: Queue & Partial<typeof sdk> };

// Command queue: the host app may call boot() before this async script has loaded.
// Draining a queue is the only thing that makes that race impossible.
const existing = w.stk?.cmd;
const queued: Fn[] = Array.isArray(existing) ? existing : [];
w.stk = Object.assign(sdk, { cmd: { push: (f: (s: typeof sdk) => void) => f(sdk) } });
queued.forEach(f => { try { f(sdk); } catch { /* one bad callback must not kill the rest */ } });

// Zero-config fallback: <script src=… data-key="pk_…">
const tag = document.currentScript as HTMLScriptElement | null;
const dataKey = tag?.dataset.key;
if (dataKey && !queued.length) boot({ key: dataKey, api: tag?.dataset.api });
