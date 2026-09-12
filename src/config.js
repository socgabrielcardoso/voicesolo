import { resolve } from 'node:path';

function integer(env, key, fallback, min, max) {
  const value = Number(env[key] || fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${key}`);
  return value;
}

export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const baseUrl = new URL(env.PUBLIC_BASE_URL || env.RENDER_EXTERNAL_URL || 'http://localhost:3000');
  if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash || baseUrl.pathname !== '/') throw new Error('PUBLIC_BASE_URL must be an origin');
  if (production && baseUrl.protocol !== 'https:') throw new Error('HTTPS required in production');
  if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error('Invalid PUBLIC_BASE_URL');
  const dataKey = env.DATA_KEY || '';
  const adminToken = env.ADMIN_TOKEN || '';
  if (!/^[a-f0-9]{64}$/i.test(dataKey)) throw new Error('Run npm run setup: DATA_KEY requires 64 hex characters');
  if (adminToken.length < 32) throw new Error('Run npm run setup: ADMIN_TOKEN requires at least 32 characters');
  const timeZone = env.TIME_ZONE || 'America/Sao_Paulo';
  new Intl.DateTimeFormat('pt-BR', { timeZone }).format();
  return Object.freeze({
    production, host: env.HOST || (production ? '0.0.0.0' : '127.0.0.1'),
    port: integer(env, 'PORT', 3000, 1, 65535), baseUrl: baseUrl.origin,
    apiKey: env.OPENAI_API_KEY || '', textModel: env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',
    ttsModel: env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', realtimeModel: env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2',
    voice: env.OPENAI_VOICE || 'coral', skillId: env.ALEXA_SKILL_ID || '',
    allowedUsers: new Set((env.ALLOWED_ALEXA_USERS || '').split(',').map(v => v.trim()).filter(Boolean)),
    adminToken, dataKey, dataDir: resolve(env.DATA_DIR || './data'), timeZone,
    dailyTurns: integer(env, 'DAILY_TURN_LIMIT', 100, 1, 10000),
    dailyRealtime: integer(env, 'DAILY_REALTIME_LIMIT', 10, 1, 100),
    realtimeMaxSeconds: integer(env, 'REALTIME_MAX_SECONDS', 300, 30, 600),
    historyTtl: integer(env, 'HISTORY_TTL_SECONDS', 86400, 60, 604800),
    alexaWaitMs: integer(env, 'ALEXA_WAIT_MS', 5000, 100, 5500),
    jobTimeoutMs: integer(env, 'JOB_TIMEOUT_MS', 25000, 1000, 60000),
    ffmpeg: env.FFMPEG_PATH || 'ffmpeg'
  });
}
