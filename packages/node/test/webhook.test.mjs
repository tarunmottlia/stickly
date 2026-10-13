import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyWebhook, tryVerifyWebhook, shouldGrant, signUserToken, SticklyWebhookError }
  from '../dist/index.js';

const SECRET = 'whsec_test_0123456789abcdef';
const body = JSON.stringify({
  event: 'reward.claimed', id: 'clm_1', userId: 'u_1',
  rewardId: 'github_star', credits: 2, mode: 'live',
});
const sign = (b = body, t = Math.floor(Date.now() / 1000), secret = SECRET) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${b}`).digest('hex')}`;

test('accepts a correctly signed delivery', () => {
  const e = verifyWebhook(body, sign(), SECRET);
  assert.equal(e.id, 'clm_1');
  assert.equal(e.credits, 2);
});

test('rejects a missing header', () => {
  assert.throws(() => verifyWebhook(body, null, SECRET),
    (e) => e instanceof SticklyWebhookError && e.reason === 'missing_signature');
});

test('rejects a malformed header', () => {
  assert.throws(() => verifyWebhook(body, 'garbage', SECRET),
    (e) => e.reason === 'malformed_signature');
});

test('rejects a signature made with the wrong secret', () => {
  assert.throws(() => verifyWebhook(body, sign(body, undefined, 'wrong'), SECRET),
    (e) => e.reason === 'bad_signature');
});

test('rejects a replay outside the tolerance', () => {
  const old = Math.floor(Date.now() / 1000) - 600;
  assert.throws(() => verifyWebhook(body, sign(body, old), SECRET),
    (e) => e.reason === 'timestamp_out_of_tolerance');
});

test('rejects a body edited after signing', () => {
  const header = sign();
  const tampered = body.replace('"credits":2', '"credits":99999');
  assert.throws(() => verifyWebhook(tampered, header, SECRET),
    (e) => e.reason === 'bad_signature');
});

test('re-serialising the body breaks it — the documented footgun', () => {
  const header = sign();
  const roundTripped = JSON.stringify(JSON.parse(body), null, 2);
  assert.throws(() => verifyWebhook(roundTripped, header, SECRET),
    (e) => e.reason === 'bad_signature');
});

test('tryVerifyWebhook branches instead of throwing', () => {
  assert.deepEqual(tryVerifyWebhook(body, null, SECRET), { ok: false, reason: 'missing_signature' });
  assert.equal(tryVerifyWebhook(body, sign(), SECRET).ok, true);
});

test('shouldGrant refuses test mode and test deliveries', () => {
  const live = JSON.parse(body);
  assert.equal(shouldGrant(live), true);
  assert.equal(shouldGrant({ ...live, mode: 'test' }), false);
  assert.equal(shouldGrant({ ...live, test: true }), false);
});
