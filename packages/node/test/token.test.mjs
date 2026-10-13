import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { signUserToken } from '../dist/index.js';

const SECRET = 'stksign_abc123';
const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString());

test('mints a verifiable HS256 token', () => {
  const tok = signUserToken({ sub: 'u_opaque_1' }, SECRET);
  const [h, p, s] = tok.split('.');
  assert.deepEqual(decode(h), { alg: 'HS256', typ: 'JWT' });
  assert.equal(decode(p).sub, 'u_opaque_1');
  const want = createHmac('sha256', SECRET).update(`${h}.${p}`)
    .digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(s, want);
});

test('carries optional display claims and leaves them out otherwise', () => {
  assert.equal(decode(signUserToken({ sub: 'u', name: 'Asha' }, SECRET).split('.')[1]).name, 'Asha');
  assert.equal(decode(signUserToken({ sub: 'u' }, SECRET).split('.')[1]).name, undefined);
});

test('expires in 24h by default and honours an override', () => {
  const now = () => 1_700_000_000_000;
  assert.equal(decode(signUserToken({ sub: 'u' }, SECRET, { now }).split('.')[1]).exp,
    1_700_000_000 + 86_400);
  assert.equal(decode(signUserToken({ sub: 'u' }, SECRET, { now, expiresInSeconds: 60 }).split('.')[1]).exp,
    1_700_000_000 + 60);
});

test('refuses to mint without a sub or a secret', () => {
  assert.throws(() => signUserToken({ sub: '' }, SECRET), /sub.*required/);
  assert.throws(() => signUserToken({ sub: 'u' }, ''), /secret.*required/);
});
