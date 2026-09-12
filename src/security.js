import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function secureEqual(a, b) {
  const x = Buffer.from(a || ''), y = Buffer.from(b || '');
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

export function ownerId(raw, key) {
  return createHmac('sha256', Buffer.from(key, 'hex')).update(raw).digest('hex');
}

export function encrypt(value, key) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), nonce);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), body]).toString('base64');
}

export function decrypt(value, key) {
  const bytes = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
}

export function escapeXml(text) {
  return String(text).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
}

export function validateAlexaEnvelope(body, config, now = Date.now()) {
  const system = body?.context?.System;
  const request = body?.request;
  const appId = system?.application?.applicationId;
  if (!config.skillId || appId !== config.skillId) throw new Error('Invalid skill');
  if (body.session?.application?.applicationId && body.session.application.applicationId !== appId) throw new Error('Invalid session skill');
  const stamp = Date.parse(request?.timestamp);
  if (!Number.isFinite(stamp) || Math.abs(now - stamp) > 150000) throw new Error('Invalid timestamp');
  if (request?.locale !== 'pt-BR') throw new Error('Unsupported locale');
  if (typeof request?.requestId !== 'string' || request.requestId.length > 256 || request.requestId.length < 1) throw new Error('Invalid request ID');
  const user = system?.user?.userId;
  if (typeof user !== 'string' || user.length > 512) throw new Error('Missing user');
  if (body.session?.user?.userId && body.session.user.userId !== user) throw new Error('Invalid session user');
  return { rawUser: user, owner: ownerId(user, config.dataKey), authorized: config.allowedUsers.has(user) };
}

export function rateGate({ limit = 60, interval = 60000, maxKeys = 1000 } = {}) {
  const buckets = new Map();
  return key => {
    const now = Date.now();
    for (const [k, value] of buckets) if (value.until <= now) buckets.delete(k);
    let item = buckets.get(key);
    if (!item) {
      if (buckets.size >= maxKeys) return false;
      item = { count: 0, until: now + interval }; buckets.set(key, item);
    }
    return ++item.count <= limit;
  };
}
