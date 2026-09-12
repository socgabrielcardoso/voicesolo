import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { encodeAlexaMp3 } from '../src/audio.js';

test('generated MP3 meets Alexa codec, bitrate and sample-rate requirements', async () => {
  const pcm = Buffer.alloc(24000 * 2);
  for (let i = 0; i < 24000; i++) pcm.writeInt16LE(Math.round(Math.sin(i * Math.PI * 2 * 440 / 24000) * 3000), i * 2);
  const mp3 = await encodeAlexaMp3(pcm);
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,bit_rate,channels', '-of', 'json', '-i', 'pipe:0'], { input: mp3, encoding: 'utf8' });
  assert.equal(probe.status, 0); const stream = JSON.parse(probe.stdout).streams[0];
  assert.equal(stream.codec_name, 'mp3'); assert.equal(stream.sample_rate, '24000'); assert.equal(stream.bit_rate, '48000'); assert.equal(stream.channels, 2);
});
