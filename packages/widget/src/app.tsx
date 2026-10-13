import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { ICONS, STICKLY_MARK, favicon } from './icons';

type Task = { id: string; type: string; label: string; cta: string; icon: string;
              url: string; credits: number; steps: string[];
              /** 'none' pays on claim; anything else collects something first and
               *  holds the credits until the founder approves. */
              verify?: 'none' | 'link' | 'screenshot' };
type Config = {
  heading: string; subtext: string; accentColor: string; radius: number;
  theme: 'light' | 'dark'; position: 'bottom-right' | 'bottom-left' | 'center';
  creditLabel: string; displayAs: 'number' | 'currency'; currencySymbol?: string;
  expiryNote?: { enabled: boolean; days: number }; badgeHidden: boolean;
  displayMode?: 'popup' | 'floating' | 'inline';
  launcherLabel?: string; inlineSelector?: string;
};
export type Payload = { config: Config; tasks: Task[]; enabled: boolean; mode: 'test' | 'live' };

type State = Record<string, 'open' | 'proof' | 'pending' | 'claimed' | 'review' | 'error'>;

/**
 * Downscaled before it leaves the browser. A phone screenshot is several
 * megabytes and none of those pixels help somebody read whether the review was
 * posted. Mirrors what the dashboard's feedback box does, deliberately — the
 * claim endpoint caps the result either way.
 */
async function shrink(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return null;
  const max = 1400;
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * k);
  cv.height = Math.round(bmp.height * k);
  cv.getContext('2d')?.drawImage(bmp, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/jpeg', 0.7);
}

/**
 * Text that sits on the founder's accent. The accent is theirs to choose and can be
 * anything from acid lime to deep indigo, so the label colour is derived rather than
 * fixed — a hardcoded dark ink disappears on a dark accent.
 */
export function inkOn(hex: string): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#fff';
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const n = parseInt(h, 16);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin((n >> 16 & 255) / 255)
          + 0.7152 * lin((n >> 8 & 255) / 255)
          + 0.0722 * lin((n & 255) / 255);
  return L > 0.45 ? '#141414' : '#ffffff';
}

function Icon({ t }: { t: Task }) {
  const mark = ICONS[t.icon];
  if (mark) {
    const [d, colour] = mark;
    return (
      <span class="stk-ico">
        <svg viewBox="0 0 24 24" fill={colour}><path d={d} /></svg>
      </span>
    );
  }
  const f = favicon(t.url);
  return <span class="stk-ico">{f ? <img src={f} width="14" height="14" alt="" /> : null}</span>;
}

export function Widget({ payload, onClose, onClaim, onTrack, hideClose }: {
  payload: Payload; onClose: () => void;
  /** Inline has nothing to close back to, so the X would strand the widget. */
  hideClose?: boolean;
  onClaim: (t: Task, proof?: { url?: string; image?: string }) => Promise<boolean>;
  onTrack: (type: string, taskId?: string) => void;
}) {
  const { config: c, tasks } = payload;
  const [state, setState] = useState<State>({});

  /**
   * How many rewards are still below the fold.
   *
   * The list caps at four rows and scrolls. A 6px scrollbar inside somebody
   * else's page is not a signal anyone reads, so the count is measured from the
   * scroll position itself rather than from `tasks.length` — it stays honest as
   * the list is scrolled, and reaches zero exactly at the end.
   */
  const listRef = useRef<HTMLUListElement>(null);
  const [below, setBelow] = useState(0);
  const measure = () => {
    const el = listRef.current;
    if (!el) return;
    const ROW = 66; // 60px row + 6px gap
    setBelow(Math.max(0, Math.round((el.scrollHeight - el.scrollTop - el.clientHeight) / ROW)));
  };
  // Measured after paint: before layout, scrollHeight equals clientHeight and
  // the hint never appears.
  useLayoutEffect(measure, [tasks.length]);

  const money = (n: number) =>
    c.displayAs === 'currency' ? `${c.currencySymbol ?? '$'}${n}` : `${n}`;
  const priced = (n: number) =>
    c.displayAs === 'currency' ? money(n) : `${n} ${c.creditLabel}`;

  const total = tasks.reduce((s, t) => s + t.credits, 0);
  const earned = tasks.filter(t => state[t.id] === 'claimed').reduce((s, t) => s + t.credits, 0);
  const left = tasks.filter(t => (state[t.id] ?? 'open') === 'open').length;

  // Only the proof a row is currently collecting; cleared the moment it is sent.
  const [draft, setDraft] = useState<{ url: string; image: string | null }>({ url: '', image: null });

  async function go(t: Task) {
    onTrack('task_clicked', t.id);
    if (t.url) window.open(t.url, '_blank', 'noopener,noreferrer');

    // A reward that asks for proof opens a field instead of claiming. The link
    // still opens first, because the thing they have to prove has to be done
    // before it can be pasted.
    if (t.verify && t.verify !== 'none') {
      setDraft({ url: '', image: null });
      setState(s => ({ ...s, [t.id]: 'proof' }));
      return;
    }

    setState(s => ({ ...s, [t.id]: 'pending' }));
    const ok = await onClaim(t);
    setState(s => ({ ...s, [t.id]: ok ? 'claimed' : 'error' }));
  }

  async function send(t: Task) {
    setState(s => ({ ...s, [t.id]: 'pending' }));
    const ok = await onClaim(t, { url: draft.url || undefined, image: draft.image || undefined });
    setDraft({ url: '', image: null });
    // 'review', not 'claimed': the credits have not been granted and the row
    // must not claim they have. The founder still has to approve it.
    setState(s => ({ ...s, [t.id]: ok ? 'review' : 'error' }));
  }

  return (
    <div class="stk" data-theme={c.theme} data-pos={c.position}
         style={{ '--accent': c.accentColor, '--accent-ink': inkOn(c.accentColor),
                  '--r': `${c.radius}px` } as never}>
      <div class="stk-head">
        <div class="stk-top">
          <div style="min-width:0">
            <h3 class="stk-h">{c.heading}</h3>
            <p class="stk-sub">{c.subtext}</p>
          </div>
          {!hideClose && (
            <button class="stk-x" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <p class="stk-amt">
          <b>{money(earned)}</b>
          <span>of {money(total)} earned · {left} to claim</span>
        </p>
        <div class="stk-bar"><i style={{ width: `${total ? (earned / total) * 100 : 0}%` }} /></div>
        {c.expiryNote?.enabled && (
          <p class="stk-exp">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
            Expires in {c.expiryNote.days} days
          </p>
        )}
      </div>

      <ul class="stk-list" ref={listRef} onScroll={measure}>
        {tasks.map(t => {
          const st = state[t.id] ?? 'open';
          return (
            <li class={`stk-row${st === 'proof' ? ' is-proof' : ''}`} key={t.id}>
              <Icon t={t} />
              <span class="stk-txt">
                <b>{t.label}</b>
                <span>{st === 'review' ? 'Waiting for approval' : priced(t.credits)}</span>
              </span>
              {st === 'claimed' ? (
                <span class="stk-act is-done">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       stroke-width="3" stroke-linecap="round"><path d="m20 6-11 11-5-5" /></svg>
                  {money(t.credits)}
                </span>
              ) : st === 'review' ? (
                <span class="stk-act is-wait">In review</span>
              ) : st === 'pending' ? (
                <span class="stk-act is-wait"><i class="stk-spin" /></span>
              ) : st === 'proof' ? null : (
                <button class="stk-act" onClick={() => go(t)}>
                  {st === 'error' ? 'Retry' : `+${money(t.credits)}`}
                </button>
              )}

              {st === 'proof' && (
                <div class="stk-proof">
                  {t.verify === 'link' ? (
                    <input class="stk-in" type="url" inputMode="url" autoFocus
                      placeholder="Paste the link to your post or review"
                      value={draft.url}
                      onInput={e => setDraft(d => ({ ...d, url: (e.target as HTMLInputElement).value }))} />
                  ) : (
                    <label class="stk-file">
                      <input type="file" accept="image/*"
                        onChange={async e => {
                          const el = e.target as HTMLInputElement;
                          const f = el.files?.[0];
                          el.value = '';   // so picking the same file twice still fires
                          if (!f) return;
                          const image = await shrink(f);
                          setDraft(d => ({ ...d, image }));
                        }} />
                      {draft.image ? 'Screenshot attached — tap to replace' : 'Choose a screenshot'}
                    </label>
                  )}
                  <div class="stk-proof-act">
                    <button class="stk-link" onClick={() => setState(s => ({ ...s, [t.id]: 'open' }))}>
                      Cancel
                    </button>
                    <button class="stk-act" onClick={() => send(t)}
                      disabled={t.verify === 'link'
                        ? !/^https?:\/\/\S+/i.test(draft.url.trim())
                        : !draft.image}>
                      Submit
                    </button>
                  </div>
                  <p class="stk-note">Credits arrive once this is approved.</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {below > 0 && (
        <p class="stk-more">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          {below} more below
        </p>
      )}

      {!c.badgeHidden && (
        <div class="stk-foot">
          <a class="stk-badge" href="https://stickly.live?ref=widget" target="_blank"
             rel="noopener" onClick={() => onTrack('badge_clicked')}>
            <svg class="stk-badge-mark" viewBox="0 0 40 40" width="15" height="15" aria-hidden="true">
              <path d={STICKLY_MARK.glyph} fill="currentColor" />
              <path class="stk-badge-dot" d={STICKLY_MARK.dot} fill="currentColor" />
            </svg>
            <span>Rewards by <b>stickly.live</b></span>
          </a>
        </div>
      )}
    </div>
  );
}
