import express from 'express';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const app = express();
const PORT = Number(process.env.PORT || 3020);
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '120mb';
const JOB_TTL_MS = Number(process.env.JOB_TTL_MS || 30 * 60 * 1000);
const MAX_VIDEO_FPS = Number(process.env.MAX_VIDEO_FPS || 24);
const MAX_VIDEO_DURATION = Number(process.env.MAX_VIDEO_DURATION || 32);
const MAX_VIDEO_WIDTH = Number(process.env.MAX_VIDEO_WIDTH || 1920);
const MAX_GIF_DOWNLOAD_BYTES = Number(process.env.MAX_GIF_DOWNLOAD_BYTES || 25 * 1024 * 1024);
const IMAGE_WAIT_MS = Number(process.env.IMAGE_WAIT_MS || 10000);
const VIDEO_WAIT_MS = Number(process.env.VIDEO_WAIT_MS || 15000);
const RENDER_READY_WAIT_MS = Number(process.env.RENDER_READY_WAIT_MS || 10000);
const MEDIA_SEEK_TIMEOUT_MS = Number(process.env.MEDIA_SEEK_TIMEOUT_MS || 4000);
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_FFMPEG_PATH = process.platform === 'win32'
  ? path.join(ROOT_DIR, 'bin', 'ffmpeg.exe')
  : path.join(ROOT_DIR, 'bin', 'ffmpeg');
const FFMPEG_PATH = process.env.FFMPEG_PATH || (existsSync(BUNDLED_FFMPEG_PATH) ? BUNDLED_FFMPEG_PATH : 'ffmpeg');

const jobs = new Map();
const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,Range');
  response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition,Content-Type,Content-Length,Content-Range,Accept-Ranges');
  if (request.method === 'OPTIONS') return response.status(204).end();
  return next();
});
app.use(express.json({ limit: MAX_BODY_SIZE }));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cleanFilename = (name = 'promo.mp4') => String(name).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-') || 'promo.mp4';
const clampNumber = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};
const RENDER_SCALE = clampNumber(process.env.RENDER_SCALE, 3, 1, 4);
const outputType = (value) => (value === 'webm' ? 'webm' : value === 'png' ? 'png' : 'mp4');
const contentType = (output) => (output === 'webm' ? 'video/webm' : output === 'png' ? 'image/png' : 'video/mp4');
const videoSize = ({ width, height }) => width <= MAX_VIDEO_WIDTH ? { width, height } : { width: MAX_VIDEO_WIDTH, height: Math.round(height * (MAX_VIDEO_WIDTH / width)) };
const getRequestedDuration = (payload = {}) => Number.isFinite(Number(payload.duration)) ? Number(payload.duration) : Number.isFinite(Number(payload.settings?.duration)) ? Number(payload.settings.duration) : 8;

const normalizePayload = (payload = {}) => {
  const format = payload.format || {};
  const size = videoSize({
    width: clampNumber(format.width, 1920, 320, 3840),
    height: clampNumber(format.height, 1080, 320, 3840),
  });
  const output = outputType(payload.output);
  return {
    ...size,
    output,
    html: String(payload.html || '').trim(),
    duration: clampNumber(getRequestedDuration(payload), 8, 1, MAX_VIDEO_DURATION),
    fps: clampNumber(payload.fps, 24, 8, MAX_VIDEO_FPS),
    filename: cleanFilename(payload.filename || `promo.${output}`).replace(/\.[^.]+$/, `.${output}`),
  };
};

const buildDocument = ({ html, width, height, duration }) => {
  if (/<!doctype\s+html|<html[\s>]/i.test(html)) return html;
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=${width}, initial-scale=1"/><style>html,body{width:${width}px;height:${height}px;margin:0;padding:0;overflow:hidden;background:#231f20;text-rendering:geometricPrecision;-webkit-font-smoothing:antialiased}*,*::before,*::after{box-sizing:border-box}.promo-scene{transform:none!important;transform-origin:top left!important;--promo-duration:${duration}s!important}.promo-scene,.promo-scene *{animation-duration:${duration}s!important}</style></head><body>${html}</body></html>`;
};

const runFfmpeg = (args, { stdin } = {}) => new Promise((resolve, reject) => {
  const ffmpeg = spawn(FFMPEG_PATH, args, { stdio: [stdin ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
  let stderr = '';
  ffmpeg.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  ffmpeg.on('error', reject);
  ffmpeg.on('close', (code) => code === 0 ? resolve() : reject(new Error(stderr || `ffmpeg exited with code ${code}`)));
  if (stdin) ffmpeg.stdin.end(stdin);
});

const dataUrlToBuffer = (value = '') => {
  const match = String(value).match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) throw new Error('Invalid data URL.');
  return match[2] ? Buffer.from(match[3] || '', 'base64') : Buffer.from(decodeURIComponent(match[3] || ''));
};
const bufferToDataUrl = (buffer, mimeType = 'application/octet-stream') => `data:${mimeType};base64,${buffer.toString('base64')}`;
const getGoogleDriveDownloadUrl = (fileId) => `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
