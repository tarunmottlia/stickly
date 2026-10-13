/**
 * Lives inside the shadow root, so the host's Tailwind/Bootstrap cannot reach in
 * and these rules cannot reach out. Tokens mirror the SHARED block of the
 * dashboard's globals.css — one contract, two surfaces.
 */
export const css = `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }

.stk {
  --bg: #161616; --fg: #fff; --sub: rgba(255,255,255,.55);
  --line: rgba(255,255,255,.1); --tile: rgba(255,255,255,.04);
  --track: rgba(255,255,255,.1);
  position: fixed; z-index: 2147483000; width: 380px; max-width: calc(100vw - 32px);
  font: 400 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--fg); background: var(--bg);
  border: 1px solid var(--line); border-radius: var(--r, 14px);
  box-shadow: 0 1px 2px rgba(0,0,0,.4), 0 16px 48px -12px rgba(0,0,0,.55);
  overflow: hidden; animation: stk-in .24s cubic-bezier(.2,.7,.3,1);
  font-feature-settings: "tnum";
}
.stk[data-theme="light"] {
  --bg: #fff; --fg: #141414; --sub: rgba(0,0,0,.5);
  --line: rgba(0,0,0,.08); --tile: rgba(0,0,0,.02); --track: rgba(0,0,0,.08);
}
/* Inline: the host page lays it out, so nothing is fixed, nothing floats and
   the card fills whatever box it was given. Scoped to the slot rather than the
   card so one attribute switches the whole mode. */
[data-inline] .stk {
  position: static; width: auto; max-width: none;
  box-shadow: none; animation: none;
}
[data-inline] .stk[data-pos] { inset: auto; transform: none; }

.stk[data-pos="bottom-right"] { right: 16px; bottom: 16px; }
.stk[data-pos="bottom-left"]  { left: 16px;  bottom: 16px; }

/* Centred: a modal over a dimmed page rather than a card in a corner.
   The centring lives in a transform, so this position needs its OWN entry
   animation — the shared stk-in sets transform too, and reusing it drops the
   -50%/-50% for the length of the animation, so the card flies in from the
   bottom-right corner before snapping to the middle. */
.stk[data-pos="center"] {
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  /* A short window must scroll the list, not push the card off-screen. */
  max-height: calc(100dvh - 32px); display: flex; flex-direction: column;
  animation: stk-in-center .24s cubic-bezier(.2,.7,.3,1);
}
.stk[data-pos="center"] .stk-list { flex: 1 1 auto; }

/* The dim behind a centred card. One below the card's z-index and covering the
   page, so a click anywhere outside closes it — the usual modal contract. */
.stk-scrim {
  position: fixed; inset: 0; z-index: 2147482999;
  background: rgba(14, 14, 16, .28); backdrop-filter: blur(2px);
  animation: stk-fade .24s both;
}

@media (max-width: 480px) {
  /* Corner cards stretch to the edges; a centred one stays centred and is
     already bounded by .stk's max-width. Without the :not() it was dragged to
     the bottom of the screen on a phone. */
  .stk:not([data-pos="center"]) { left: 12px; right: 12px; bottom: 12px; width: auto; }
}

.stk-launch {
  position: fixed; z-index: 2147483000; right: 16px; bottom: 16px;
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  padding: 10px 14px; border: 0; border-radius: 999px;
  background: var(--accent); color: var(--accent-ink, #141414);
  font: 500 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  box-shadow: 0 6px 20px -4px rgba(0,0,0,.35); animation: stk-in .2s both;
}
.stk-launch:hover { filter: brightness(1.06); }

.stk-head { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.stk-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; min-width: 0; }
.stk-h { margin: 0; font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
.stk-sub { margin: 2px 0 0; font-size: 12.5px; color: var(--sub); }
.stk-x { background: 0; border: 0; cursor: pointer; color: var(--sub); padding: 2px; line-height: 0; flex: 0 0 auto; }
.stk-x:hover { color: var(--fg); }

.stk-amt { margin: 0; display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.stk-amt b { font-size: 22px; font-weight: 600; letter-spacing: -.02em; }
.stk-amt span { font-size: 12px; color: var(--sub); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stk-bar { height: 6px; border-radius: 999px; background: var(--track); overflow: hidden; }
.stk-bar i { display: block; height: 100%; border-radius: 999px; background: var(--accent); transition: width .7s cubic-bezier(.2,.7,.3,1); }
.stk-exp { margin: 0; font-size: 11.5px; color: var(--sub); display: flex; align-items: center; gap: 6px; }

/* Four rows, then scroll — never a taller card.
   A row measures 60px: the two stacked lines of .stk-txt are taller than the
   28px icon, so it is the text that sets the height, not the tile. Four of
   those plus three 6px gaps and the list's own 20px of padding is the cap
   below. It was 46vh, which on a tall desktop window is nine or ten rewards and
   a popup reaching halfway up somebody else's product. */
.stk-list {
  list-style: none; margin: 0; padding: 10px;
  display: flex; flex-direction: column; gap: 6px;
  background: var(--tile);
  --stk-row: 60px; --stk-gap: 6px; --stk-rows: 4;
  max-height: calc(var(--stk-rows) * var(--stk-row)
                 + (var(--stk-rows) - 1) * var(--stk-gap) + 20px);
  overflow-y: auto; overscroll-behavior: contain;
  /* Firefox. The accent is the founder's, so the bar reads as part of their
     product rather than as the browser's default grey. */
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent) 55%, transparent) transparent;
}
.stk-list::-webkit-scrollbar { width: 6px; }
.stk-list::-webkit-scrollbar-track { background: transparent; }
.stk-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 45%, transparent);
}
.stk-list::-webkit-scrollbar-thumb:hover { background: var(--accent); }

/* "3 more" — because a scrollbar 6px wide inside somebody else's page is not a
   reliable signal that there is anything below. It hides itself once the list
   is scrolled to the end, so it never lies. */
.stk-more {
  margin: 0; padding: 7px 16px; font-size: 11.5px; color: var(--sub);
  display: flex; align-items: center; justify-content: center; gap: 5px;
  border-top: 1px solid var(--line); background: var(--tile);
}
.stk-more svg { opacity: .7; animation: stk-nudge 1.6s ease-in-out infinite; }
.stk-row { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 10px; border: 1px solid var(--line); border-radius: calc(var(--r, 14px) - 4px); background: var(--bg); }
.stk-ico { flex: 0 0 auto; width: 28px; height: 28px; border-radius: 7px; background: #fff; border: 1px solid rgba(0,0,0,.08); display: grid; place-items: center; }
/* Each mark carries its own fill; the tile stays white so dark marks (X,
   GitHub, TikTok) survive the dark theme without being recoloured. */
.stk-ico svg { width: 14px; height: 14px; }
.stk-txt { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.stk-txt b { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stk-txt span { font-size: 11.5px; color: var(--sub); }

/* Every state is the same height, so claiming never makes the list jump. */
.stk-act { flex: 0 0 auto; height: 28px; min-width: 56px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  border: 0; border-radius: 7px; cursor: pointer; font: 600 12px/1 inherit; padding: 0 12px;
  background: var(--accent); color: var(--accent-ink, #141414); }
.stk-act:hover { filter: brightness(1.06); }
.stk-act[disabled] { cursor: default; }
.stk-act.is-done { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); font-weight: 500; }
/* On the dark card an 18% tint sits too close to a mid-tone accent; lift the glyph. */
.stk:not([data-theme="light"]) .stk-act.is-done { color: color-mix(in srgb, var(--accent) 55%, #fff); }
.stk-act.is-wait { background: var(--track); color: var(--sub); }
.stk-spin { width: 13px; height: 13px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: stk-spin .7s linear infinite; }

/* The badge is how most people find Stickly, so it is a link rather than a
   credit line — but a quiet one, sitting inside somebody else's product. At rest
   it is a grey mark and a sentence; on hover the dot takes the brand violet and
   the text comes up to full contrast, which is the whole affordance. Nothing
   swaps and nothing resizes: a row that rewrites itself under the pointer, in a
   card the host did not build, reads as a glitch. */
.stk-foot { padding: 9px 16px; font-size: 11.5px; color: var(--sub); border-top: 1px solid var(--line); }
.stk-badge {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  color: inherit; text-decoration: none; transition: color .18s ease;
  /* The :host all-initial reset wipes the anchor's default cursor, so the badge
     showed a text caret over its own label. It is a link; say so. Backticks are
     deliberately absent here -- this file is one template literal. */
  cursor: pointer;
}
.stk-badge b { font-weight: 500; }
.stk-badge-mark { flex: 0 0 auto; opacity: .55; transition: opacity .18s ease; }
.stk-badge-dot { transition: fill .18s ease; }
.stk-badge:hover { color: var(--fg); }
.stk-badge:hover b { text-decoration: underline; text-underline-offset: 2px; }
.stk-badge:hover .stk-badge-mark { opacity: 1; }
.stk-badge:hover .stk-badge-dot { fill: #5138EE; }
.stk-badge:focus-visible { outline: 2px solid #5138EE; outline-offset: 2px; border-radius: 4px; }

/* The proof field. It grows inside the row rather than opening a second panel:
   the card is 380px wide and sitting on top of somebody else's product, so a
   nested dialog is one surface too many. The row is allowed to be taller than
   the usual 50px while it is collecting — the list scrolls. */
.stk-row.is-proof { flex-wrap: wrap; }
.stk-proof { flex: 1 0 100%; display: flex; flex-direction: column; gap: 8px; margin-top: 10px; min-width: 0; }
.stk-in {
  width: 100%; min-width: 0; height: 32px; padding: 0 10px;
  border: 1px solid var(--line); border-radius: 7px;
  background: var(--tile); color: var(--fg); font: 400 12.5px/1 inherit;
}
.stk-in::placeholder { color: var(--sub); }
.stk-in:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: transparent; }
.stk-file {
  display: flex; align-items: center; justify-content: center; min-height: 32px;
  padding: 7px 10px; cursor: pointer; text-align: center;
  border: 1px dashed var(--line); border-radius: 7px;
  background: var(--tile); font-size: 12.5px; color: var(--sub);
}
.stk-file:hover { color: var(--fg); }
.stk-file input { display: none; }
.stk-proof-act { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
.stk-proof .stk-act[disabled] { opacity: .45; cursor: default; filter: none; }
.stk-link { background: 0; border: 0; padding: 0; cursor: pointer; color: var(--sub); font: 400 12.5px/1 inherit; }
.stk-link:hover { color: var(--fg); }
.stk-note { margin: 0; font-size: 11.5px; color: var(--sub); }

.stk-steps { margin: 6px 0 0; padding-left: 18px; font-size: 12px; color: var(--sub); }
.stk-err { padding: 10px 16px; font-size: 12px; color: #ff6b6b; border-top: 1px solid var(--line); }

@keyframes stk-in { from { opacity: 0; transform: translateY(8px) scale(.99); } }
@keyframes stk-in-center { from { opacity: 0; transform: translate(-50%, calc(-50% + 8px)) scale(.99); } }
@keyframes stk-fade { from { opacity: 0; } }
@keyframes stk-nudge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
@keyframes stk-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { * { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
`;
