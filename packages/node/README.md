# @stickly/node

Server-side helpers for [Stickly](https://stickly.live) — verify reward webhooks
and sign the token that identifies your user. **Zero dependencies**; everything
is `node:crypto`. ESM and CJS, fully typed.

```bash
npm i @stickly/node
```

## Verify a webhook

```ts
import { verifyWebhook, shouldGrant } from '@stickly/node';

const raw = await req.text();                 // RAW bytes — never a re-serialised object
const event = verifyWebhook(raw, req.headers.get('x-stickly-signature'),
                            process.env.STICKLY_WEBHOOK_SECRET!);

if (shouldGrant(event)) {
  await grantCredits(event.userId, event.credits, { idempotencyKey: event.id });
}
return Response.json({ ok: true });
```

`verifyWebhook` checks the HMAC over the raw body, rejects a timestamp outside a
five-minute tolerance, compares in constant time, and then parses. It throws a
`SticklyWebhookError` whose `reason` is one of `missing_signature`,
`malformed_signature`, `timestamp_out_of_tolerance`, `bad_signature`,
`bad_json`. Use `tryVerifyWebhook` if you would rather branch than catch.

`shouldGrant` returns false for the dashboard's test deliveries and for anything
claimed with a test key — those skip identity verification, so their `userId` is
whatever the browser said it was.

## Sign a user token

```ts
import { signUserToken } from '@stickly/node';

const token = signUserToken({ sub: user.opaqueId }, process.env.STICKLY_SIGNING_SECRET!);
```

Server side only. Put an **opaque id** in `sub`: it is sent to a third party,
readable in a JWT the browser holds, and returned in every webhook. `name` and
`email` are optional, display-only, and must travel here rather than in `boot()`.

## Secrets

| Variable | Shape | Where |
|---|---|---|
| `STICKLY_PUBLIC_KEY` | `pk_live_…` | safe in the browser |
| `STICKLY_SIGNING_SECRET` | `stksign_` or older `whsec_` + hex | server only |
| `STICKLY_WEBHOOK_SECRET` | bare hex, no prefix | server only |

The two secrets are easy to swap. Go by the prefix: anything with one is the
**signing** secret; a bare hex string is the **webhook** secret.

MIT · [source](https://github.com/tarunmottlia/stickly/tree/main/packages/node)
