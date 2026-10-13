/**
 * @stickly/node — the server half of a Stickly integration.
 *
 * Two jobs, and both of them are the kind that look trivial and are not:
 * proving to Stickly which of your users is claiming, and proving to yourself
 * that an incoming reward webhook really came from Stickly.
 *
 * No dependencies. Everything here is `node:crypto`.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/* ── webhooks ──────────────────────────────────────────────────────────── */

export interface RewardClaimed {
  event: 'reward.claimed';
  /** Unique per claim. Use it as your idempotency key — retries WILL happen. */
  id: string;
  /** Whatever you put in the token's `sub`. Never an email unless you sent one. */
  userId: string;
  /** The template id, or the task's own id for a custom reward. */
  rewardId: string;
  credits: number;
  mode: 'live' | 'test';
  /** Present only on a delivery from the dashboard's "Send test webhook". */
  test?: boolean;
}

export class SticklyWebhookError extends Error {
  constructor(readonly reason:
    | 'missing_signature' | 'malformed_signature' | 'timestamp_out_of_tolerance'
    | 'bad_signature' | 'bad_json') {
    super(reason);
    this.name = 'SticklyWebhookError';
  }
}

/**
 * Verify a webhook and return its parsed body.
 *
 * Pass the **raw request body**, not a parsed-and-re-serialised object. JSON
 * round-tripping changes whitespace and key order, which changes the bytes the
 * signature was computed over, and every delivery then fails for a reason that
 * looks like a wrong secret. This is the single most common way to get this
 * wrong, so it is worth saying twice: raw bytes, verify, *then* parse.
 *
 * ```ts
 * const raw = await req.text();
 * const event = verifyWebhook(raw, req.headers.get('x-stickly-signature'),
 *                             process.env.STICKLY_WEBHOOK_SECRET!);
 * ```
 *
 * @throws {SticklyWebhookError} with a `reason` you can switch on.
 */
export function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  opts: { toleranceSeconds?: number; now?: () => number } = {},
): RewardClaimed {
  if (!signatureHeader) throw new SticklyWebhookError('missing_signature');

  const ts = Number(/t=(\d+)/.exec(signatureHeader)?.[1]);
  const given = /v1=([a-f0-9]+)/.exec(signatureHeader)?.[1];
  if (!ts || !given) throw new SticklyWebhookError('malformed_signature');

  // The timestamp is inside the signed payload, so an attacker cannot move it.
  // Checking it is what stops a captured delivery being replayed forever.
  const tolerance = opts.toleranceSeconds ?? 300;
  const now = (opts.now ?? Date.now)() / 1000;
  if (Math.abs(now - ts) > tolerance) {
    throw new SticklyWebhookError('timestamp_out_of_tolerance');
  }

  const want = createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest();
  const got = Buffer.from(given, 'hex');
  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false, which would turn a malformed header into a 500.
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    throw new SticklyWebhookError('bad_signature');
  }

  try {
    return JSON.parse(rawBody) as RewardClaimed;
  } catch {
    throw new SticklyWebhookError('bad_json');
  }
}

/** Non-throwing variant, when you would rather branch than catch. */
export function tryVerifyWebhook(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  opts?: { toleranceSeconds?: number; now?: () => number },
): { ok: true; event: RewardClaimed } | { ok: false; reason: SticklyWebhookError['reason'] } {
  try {
    return { ok: true, event: verifyWebhook(rawBody, signatureHeader, secret, opts) };
  } catch (err) {
    if (err instanceof SticklyWebhookError) return { ok: false, reason: err.reason };
    throw err;
  }
}

/**
 * Should this delivery move credits?
 *
 * Returns false for the dashboard's test button and for anything claimed with a
 * test key. Test keys skip identity verification on Stickly's side, so their
 * `userId` is whatever the browser said it was — granting on one would hand
 * anybody an unlimited credit mint.
 */
export function shouldGrant(event: RewardClaimed): boolean {
  return event.event === 'reward.claimed' && event.mode === 'live' && !event.test;
}

/* ── identity ──────────────────────────────────────────────────────────── */

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export interface UserTokenClaims {
  /**
   * Your id for this user, and the value that comes back in every webhook.
   *
   * It is sent to a third party and it is readable in a JWT the browser holds,
   * so choose something you are happy to share. If your primary key is an email
   * address, map it to an opaque id and send that instead.
   */
  sub: string;
  /** Optional, display only — it decides what the founder sees in Activity. */
  name?: string;
  /** Optional, display only. Omit it if you would rather not share addresses. */
  email?: string;
}

/**
 * Mint the token the widget identifies a user with. **Server side only.**
 *
 * The signing secret must never reach browser code. Stickly does not verify
 * that a task was actually done — identity is the only thing standing between
 * an attacker and an unbounded credit mint, so a leaked signing secret is the
 * whole game.
 */
export function signUserToken(
  claims: UserTokenClaims,
  signingSecret: string,
  opts: { expiresInSeconds?: number; now?: () => number } = {},
): string {
  if (!claims?.sub) throw new Error('signUserToken: `sub` is required');
  if (!signingSecret) throw new Error('signUserToken: signing secret is required');

  const iat = Math.floor((opts.now ?? Date.now)() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    ...claims,
    iat,
    exp: iat + (opts.expiresInSeconds ?? 24 * 60 * 60),
  }));
  const data = `${header}.${payload}`;
  const sig = b64url(createHmac('sha256', signingSecret).update(data).digest());
  return `${data}.${sig}`;
}
