# Integration guide for coding agents

This file is written for an agent — Claude Code, Codex, Cursor, Copilot — that
has been asked to add Stickly to an application. A human should read
[README.md](./README.md) instead.

Everything below is a failure that actually happened during a real integration,
not a precaution. Work through the steps in order. Where a step says **STOP**,
stop and ask the developer: it needs something only a human with a browser can
do, and carrying on with a placeholder is how an integration ends up looking
finished and granting nothing.

If you only take one thing from this file: **`npm i @stickly/node`** and use
`verifyWebhook()` and `signUserToken()` rather than hand-rolling HMAC and JWT.
Most of the steps below exist because people hand-rolled them.

---

Install the Stickly rewards widget in this app.

Stickly shows our users a short list of tasks — follow, star, join, review,
refer — and each one is worth credits in OUR product. Stickly never holds the
credits: it tells us a task was claimed and we grant them.

Work through the steps in order. Several of them need a human to click something
in a dashboard that you cannot reach. Where a step says STOP, stop and ask —
do not substitute a placeholder and do not mark the task done.


════════════════════════════════════════════════════════════════════
THE THREE SECRETS, AND WHY THEY ARRIVE AT DIFFERENT TIMES
════════════════════════════════════════════════════════════════════

  STICKLY_PUBLIC_KEY       pk_live_YOUR_KEY
      Safe in the browser. Already filled in above. Shape: pk_live_…

  STICKLY_SIGNING_SECRET   server only
      Signs the token that says which of OUR users is claiming.
      Shape: "stksign_" + 48 hex characters on a key issued recently.
      Older workspaces show "whsec_" + 48 OR 64 hex — same value, older format.
      Treat any of those three as correct. Do not reject it for being the
      wrong length: the 64-hex ones are real, in production, and granting
      credits today.

  STICKLY_WEBHOOK_SECRET   server only
      Verifies that an incoming reward webhook really came from Stickly.
      Shape: 32 hex characters, NO prefix.

The two secrets are easy to mix up and the prefix does not help, so go by the
prefix first: anything starting stksign_ or whsec_ is the SIGNING secret,
whatever its length. A bare hex string with no prefix is the WEBHOOK secret.

THE WEBHOOK SECRET DOES NOT EXIST YET. It is created at the moment a webhook
URL is saved, which is STEP 5. So the ".env" file is downloaded twice: once now
for the first two values, once after STEP 5 for the third.


════════════════════════════════════════════════════════════════════
STEP 1 — Get the first two secrets.          ← needs a human
════════════════════════════════════════════════════════════════════

Ask the developer to:
  1. open https://app.stickly.live/integrate
  2. go to Settings → API keys
  3. press "Download .env"
  4. paste the two values into this project's environment

STOP here if STICKLY_SIGNING_SECRET is missing. Do not invent one, do not use
the public key in its place, and do not continue to STEP 2 — every later step
depends on it and a placeholder will fail silently at the identity check.

Expect STICKLY_WEBHOOK_SECRET to be absent or commented out at this point.
That is correct. Do not ask for it yet.

  ✅ Done when: STICKLY_PUBLIC_KEY and STICKLY_SIGNING_SECRET are both set.


════════════════════════════════════════════════════════════════════
STEP 2 — Check the Content-Security-Policy FIRST.
════════════════════════════════════════════════════════════════════

Do this before writing any code. If the app sends a CSP header and we skip
this, the script is blocked, window.stk is never defined, the boot call sits in
a queue forever, the widget never appears, and NOTHING is logged on the server.
It looks exactly like a widget that was never installed.

Search the project for a CSP: next.config, middleware, a helmet config, nginx,
a meta http-equiv="Content-Security-Policy", or a hosting-level header rule.

If one exists, it needs all three of these:

  script-src   cdn.stickly.live
  connect-src  cdn.stickly.live
  img-src      data: https://www.google.com      (task icons fall back to favicons)

If the CSP uses a nonce, the script tag needs that nonce too.

  ✅ Done when: either no CSP exists, or the directives above are present.
  ✅ Verify later in STEP 6 by checking the browser console for a CSP error.


════════════════════════════════════════════════════════════════════
STEP 3 — Load the widget.
════════════════════════════════════════════════════════════════════



Add the script:

  <script src="https://cdn.stickly.live/w.js" data-key="pk_live_YOUR_KEY" async></script>

WHERE to put it: on the pages where a signed-in user actually is — the app
shell, not the root layout of a marketing site. Live keys refuse any claim
without a signed identity token, so booting on logged-out pages can never grant
anything and only costs one CDN request per pageview.

  ✅ Done when: window.stk is defined in the browser console on a signed-in page.


════════════════════════════════════════════════════════════════════
STEP 4 — Tell Stickly which of our users it is talking to.
════════════════════════════════════════════════════════════════════

The user id must come from a token we sign on the SERVER. Stickly reads the
user from that token and never from the browser — it does not verify that a
task was really done, so identity is the only thing stopping anyone from
minting credits in a console loop.

  // server — e.g. an API route that only a signed-in user can reach
  import jwt from 'jsonwebtoken';

  const token = jwt.sign(
    {
      sub: ourOpaqueUserId,                 // see the warning below
      // Optional, and only for OUR OWN dashboard. Leave both out and the
      // Activity feed shows the opaque id instead, which is often what you want.
      // name:  user.name,
      // email: user.email,
    },
    process.env.STICKLY_SIGNING_SECRET,
    { algorithm: 'HS256', expiresIn: '24h' },
  );

  // browser — once the signed-in user is known
  window.stk = window.stk || { cmd: [] };
  window.stk.cmd.push(s => s.boot({
    key:   'pk_live_YOUR_KEY',
    token,                                 // fetched from the server above
  }));

⚠️  CHOOSE THE ID DELIBERATELY. Whatever goes in `sub` is sent to a third
party, is readable in a JWT the browser holds, and comes back to us in every
webhook. If our primary user id is an email address or anything else personal,
do NOT put it here — map it to an opaque id (a UUID column, or an HMAC of the
real id) and send that. The webhook will return the same value, so we can map
it back.

About `name` and `email`: they are optional, they only decide what the
founder sees in their own Activity feed, and they must go in the TOKEN, not in
boot(). Stickly ignores them anywhere else on a live key — otherwise any user
could type a colleague's address into a console and have it appear next to their
claim. Send them only if we are comfortable with Stickly storing them; without
them every row shows the opaque id, and nothing else changes.

One thing that is NOT needed, despite looking like it is:
  • Any call on logged-out pages — see STEP 3.

Call window.stk.shutdown() on sign-out, or the next person on a shared machine
inherits the previous user's widget.

The rest of the SDK, all available on the object boot() receives:
  s.boot(opts)        start it
  s.shutdown()        tear it down and remove the DOM
  s.open()            open the card — this is how POPUP mode is opened
  s.close()           close it
  s.show() / s.hide() keep state, just toggle visibility
  s.updateToken(t)    swap in a fresh token without re-booting
  s.getRef()          the referral code this visitor arrived with, or null

  ✅ Done when: the widget lists rewards for a signed-in user without a 401.


════════════════════════════════════════════════════════════════════
STEP 5 — Receive the reward and grant the credits.
════════════════════════════════════════════════════════════════════

Add a POST endpoint, for example /api/stickly/webhook:

  - Read the RAW body first. Verify, then parse. Re-serialising before the
    check changes the whitespace and breaks every signature.
  - Header "X-Stickly-Signature" is "t=<unix>,v1=<hex>", where
    v1 = HMAC_SHA256(`${t}.${rawBody}`, process.env.STICKLY_WEBHOOK_SECRET).
    Compare in constant time. Reject anything older than 5 minutes.
  - Body: { event, id, userId, rewardId, credits, mode }
  - Handle event === "reward.claimed". Ignore anything else.
  - Ignore rows where mode === "test" in production: test keys skip token
    verification, so that userId is whatever the browser said it was.
  - Add `credits` to the balance of the user whose id is `userId`, keyed on
    `id` so a retry cannot credit twice. Retries WILL happen — Stickly retries
    on 1m, 5m, 30m, 2h, 6h until it gets a 2xx.
  - Return 200 quickly. Do the slow work afterwards.
  - Anything you cannot act on — an unknown user, a replay — should still
    return 200. A non-2xx is retried for six hours and will never succeed.

Also make sure the route is reachable without a session. If the app has
middleware that redirects unauthenticated requests to a login page, this path
must be excluded, or every delivery gets a 307 to HTML.

Then deploy it, because the next step needs a public URL.


════════════════════════════════════════════════════════════════════
STEP 6 — Hand the webhook URL back.          ← needs a human. Do not skip.
════════════════════════════════════════════════════════════════════

Print OUR webhook's full public URL — the one you just built, e.g.
https://our-app.com/api/stickly/webhook — and then tell the developer, in
plain words:

  "Your Stickly webhook URL is <the URL you just printed>.

   Open the Stickly dashboard here:
     https://app.stickly.live/integrate
   go to Integrate → Connect, paste that URL into the Endpoint field, press
   Save, then press "Send test webhook". You should see a 2xx come back.

   Then go to Settings → API keys, press "Download .env" AGAIN, and give me
   STICKLY_WEBHOOK_SECRET — it did not exist until you saved that URL."

Be explicit that these are two different addresses: the one to paste is ours,
and the dashboard link is where to paste it.

STOP here. Stickly cannot discover our webhook URL on its own, and until a
human puts it in the dashboard the integration is silently dead: users claim
tasks and never get their credits. Do not mark this task complete without
STICKLY_WEBHOOK_SECRET in hand.


════════════════════════════════════════════════════════════════════
STEP 7 — Prove it, with exact expected results.
════════════════════════════════════════════════════════════════════

Run these against the deployed endpoint. Each one proves something different,
and none of them grants anybody credits.

  1. POST with no signature header
     → expect 400. Proves the header is actually required.

  2. POST with "X-Stickly-Signature: t=<now>,v1=<64 zeros>"
     → expect 401. Proves the signature is compared, not just parsed.

  3. POST with a CORRECT signature but a timestamp 10 minutes old
     → expect 401. Proves replays are rejected.

  4. POST with a CORRECT signature, current timestamp, and a body of
     {"event":"reward.claimed","id":"probe-1","userId":"<a real user id>",
      "rewardId":"probe","credits":0,"mode":"test"}
     → expect 200, and NO credit change for that user.
     This is the one that matters: it proves our webhook secret is paired with
     Stickly's, end to end, without moving anybody's balance. mode:"test" is
     what makes it safe — the handler written in STEP 5 ignores it.

Compute the signature the same way the handler does:
  v1 = HMAC_SHA256(`${t}.${rawBody}`, STICKLY_WEBHOOK_SECRET)

Then check the browser on a signed-in page:
  • console has no Content-Security-Policy error     (STEP 2)
  • window.stk is defined                            (STEP 3)
  • the widget lists rewards and does not 401        (STEP 4)


════════════════════════════════════════════════════════════════════
FINAL CHECKLIST — all of these, or the integration is not done
════════════════════════════════════════════════════════════════════

  [ ] STICKLY_PUBLIC_KEY set       (pk_live_…)
  [ ] STICKLY_SIGNING_SECRET set   (stksign_ or whsec_ prefix, server only)
  [ ] STICKLY_WEBHOOK_SECRET set   (32 hex, no prefix, server only)
  [ ] neither secret appears in any client bundle
  [ ] CSP allows cdn.stickly.live, or there is no CSP
  [ ] window.stk defined on a signed-in page
  [ ] widget lists rewards without a 401
  [ ] webhook URL saved in the dashboard and its test returned 2xx
  [ ] probes 1–4 returned 400 / 401 / 401 / 200
  [ ] the id in `sub` is opaque, not an email

If any line is unticked, say which one and why. Do not report success.