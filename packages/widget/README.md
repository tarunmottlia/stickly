# @stickly/widget

The [Stickly](https://stickly.live) rewards widget — Preact rendered into a
shadow root, 16 kB gzipped. This is the same bundle served from
`cdn.stickly.live/w.js`, packaged for people who need to pin a version or whose
CSP forbids third-party scripts.

**Most integrations do not need this package.** One script tag is simpler:

```html
<script src="https://cdn.stickly.live/w.js" data-key="pk_live_…" async></script>
```

## Why a shadow root

The widget renders inside somebody else's product. A shadow root is what stops
the host page's CSS reaching in and the widget's CSS reaching out — no resets,
no `!important`, no specificity war with whatever framework the host uses.

## Content Security Policy

If the host app sends a CSP, it needs:

```
script-src   cdn.stickly.live
connect-src  cdn.stickly.live
img-src      data: https://www.google.com
```

Without them the script is blocked, `window.stk` is never defined, and the
widget simply never appears — with nothing logged anywhere. It is the single
most confusing way for an install to fail.

## Build it yourself

```bash
npm install && npm run build   # -> dist/w.js
```

MIT · [source](https://github.com/tarunmottlia/stickly/tree/main/packages/widget)
