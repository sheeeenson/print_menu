import express from 'express';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const app = express();
const PORT = Number(process.env.PORT || 3020);
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '80mb';
const JOB_TTL_MS = Number(process.env.JOB_TTL_MS || 30 * 60 * 1000);
const MAX_VIDEO_FPS = Number(process.env.MAX_VIDEO_FPS || 24);
const MAX_VIDEO_DURATION = Number(process.env.MAX_VIDEO_DURATION || 20);
const MAX_VIDEO_WIDTH = Number(process.env.MAX_VIDEO_WIDTH || 1920);
const JPEG_FRAME_QUALITY = Number(process.env.JPEG_FRAME_QUALITY || 86);
const IMAGE_WAIT_MS = Number(process.env.IMAGE_WAIT_MS || 10000);

const jobs = new Map();

const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition,Content-Type');
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
const outputType = (value) => (value === 'webm' ? 'webm' : 'mp4');
const contentType = (output) => (output === 'webm' ? 'video/webm' : 'video/mp4');

const videoSize = ({ width, height }) => {
  if (width <= MAX_VIDEO_WIDTH) return { width, height };
  const ratio = MAX_VIDEO_WIDTH / width;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
};

const normalizePayload = (payload = {}) => {
  const format = payload.format || {};
  const requestedWidth = clampNumber(format.width, 1920, 320, 3840);
  const requestedHeight = clampNumber(format.height, 1080, 320, 3840);
  const size = videoSize({ width: requestedWidth, height: requestedHeight });
  const output = outputType(payload.output);
  return {
    ...size,
    output,
    html: String(payload.html || '').trim(),
    duration: clampNumber(payload.duration, 8, 1, MAX_VIDEO_DURATION),
    fps: clampNumber(payload.fps, 24, 8, MAX_VIDEO_FPS),
    filename: cleanFilename(payload.filename || `promo.${output}`).replace(/\.[^.]+$/, `.${output}`),
  };
};

const buildDocument = ({ html, width, height, duration }) => {
  if (/<!doctype\s+html|<html[\s>]/i.test(html)) return html;
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=${width}, initial-scale=1"/><style>html,body{width:${width}px;height:${height}px;margin:0;padding:0;overflow:hidden;background:#231f20}*,*::before,*::after{box-sizing:border-box}.promo-scene{transform:none!important;transform-origin:top left!important}.promo-scene,.promo-scene *{animation-duration:var(--promo-duration,${duration}s)}</style></head><body>${html}</body></html>`;
};

const waitForImages = async (page) => {
  await Promise.race([
    page.evaluate(async () => {
      const images = Array.from(document.images || []);
      await Promise.all(images.map(async (image) => {
        if (image.complete && image.naturalWidth > 0) return;
        if (typeof image.decode === 'function') return image.decode().catch(() => undefined);
        return new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      }));
    }).catch(() => undefined),
    wait(IMAGE_WAIT_MS),
  ]);
};

const createPage = async (browser, render) => {
  const page = await browser.newPage({ viewport: { width: render.width, height: render.height }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(0);
  page.setDefaultNavigationTimeout(0);
  await page.setContent(buildDocument(render), { waitUntil: 'domcontentloaded', timeout: 0 });
  await waitForImages(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  return page;
};

const seekAnimations = async (page, milliseconds) => {
  await page.evaluate((time) => {
    document.getAnimations({ subtree: true }).forEach((animation) => {
      try {
        animation.currentTime = time;
        animation.pause();
      } catch (error) {
        // Ignore non-controllable animations.
      }
    });
  }, milliseconds);
};

const ffmpegArgs = ({ output, outputPath, fps }) => {
  const input = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'mjpeg', '-i', 'pipe:0', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2'];
  if (output === 'webm') return [...input, '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '5', '-b:v', '0', '-crf', '34', '-pix_fmt', 'yuv420p', outputPath];
  return [...input, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outputPath];
};

const writeFrame = (ffmpeg, buffer) => new Promise((resolve, reject) => {
  const fail = (error) => reject(error);
  ffmpeg.stdin.once('error', fail);
  ffmpeg.stdin.write(buffer, () => {
    ffmpeg.stdin.off('error', fail);
    resolve();
  });
});

const renderVideo = async ({ page, render, outputPath }) => {
  const frameCount = Math.max(1, Math.round(render.duration * render.fps));
  log(`Rendering ${frameCount} frames for ${render.filename} (${render.width}x${render.height}, ${render.fps}fps, ${render.duration}s)`);

  const ffmpeg = spawn('ffmpeg', ffmpegArgs({ output: render.output, outputPath, fps: render.fps }), { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  const done = new Promise((resolve, reject) => {
    ffmpeg.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr || `ffmpeg exited with code ${code}`))));
  });

  try {
    for (let i = 0; i < frameCount; i += 1) {
      if (i === 0 || i === frameCount - 1 || i % Math.max(1, Math.round(render.fps)) === 0) log(`Frame ${i + 1}/${frameCount}`);
      await seekAnimations(page, (i / render.fps) * 1000);
      const frame = await page.screenshot({ type: 'jpeg', quality: clampNumber(JPEG_FRAME_QUALITY, 86, 50, 92), omitBackground: false, clip: { x: 0, y: 0, width: render.width, height: render.height } });
      await writeFrame(ffmpeg, frame);
    }
    ffmpeg.stdin.end();
    await done;
  } catch (error) {
    ffmpeg.stdin.destroy();
    ffmpeg.kill('SIGKILL');
    throw error;
  }
};

const renderToFile = async (payload) => {
  const render = normalizePayload(payload);
  if (!render.html) throw new Error('Missing HTML.');
  let browser;
  const workdir = await mkdtemp(path.join(tmpdir(), 'print-menu-local-render-'));
  const outputPath = path.join(workdir, render.filename);
  try {
    browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] });
    const page = await createPage(browser, render);
    await renderVideo({ page, render, outputPath });
    return { ...render, filePath: outputPath, workdir, contentType: contentType(render.output) };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};

const serializeJob = (job) => ({ id: job.id, status: job.status, output: job.output, filename: job.filename, error: job.error, downloadUrl: job.status === 'done' ? `/jobs/${job.id}/file` : null });
const cleanupJob = async (id) => {
  const job = jobs.get(id);
  if (job?.workdir) await rm(job.workdir, { recursive: true, force: true }).catch(() => {});
  jobs.delete(id);
};
const runJob = async (id, payload) => {
  const job = jobs.get(id);
  if (!job) return;
  job.status = 'rendering';
  log(`Job ${id} started`);
  try {
    Object.assign(job, await renderToFile(payload), { status: 'done' });
    log(`Job ${id} done: ${job.filename}`);
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : String(error);
    log(`Job ${id} failed: ${job.error}`);
  }
};

app.get('/health', (request, response) => response.json({ ok: true, renderer: 'print-menu-local-renderer', port: PORT, maxVideoWidth: MAX_VIDEO_WIDTH, maxVideoFps: MAX_VIDEO_FPS, maxVideoDuration: MAX_VIDEO_DURATION }));

app.post('/jobs', (request, response) => {
  const render = normalizePayload(request.body || {});
  if (!render.html) return response.status(400).json({ error: 'Invalid render payload.', detail: 'Missing HTML.' });
  const id = crypto.randomUUID();
  log(`Job ${id} queued: ${render.output}, ${render.width}x${render.height}, ${render.fps}fps, ${render.duration}s, html ${render.html.length} chars`);
  jobs.set(id, { id, status: 'queued', output: render.output, filename: render.filename });
  setTimeout(() => cleanupJob(id), JOB_TTL_MS).unref?.();
  setImmediate(() => runJob(id, request.body || {}));
  return response.status(202).json(serializeJob(jobs.get(id)));
});

app.get('/jobs/:id', (request, response) => {
  const job = jobs.get(request.params.id);
  if (!job) return response.status(404).json({ error: 'Render job not found.' });
  return response.json(serializeJob(job));
});

app.get('/jobs/:id/file', async (request, response) => {
  const job = jobs.get(request.params.id);
  if (!job) return response.status(404).json({ error: 'Render job not found.' });
  if (job.status !== 'done' || !job.filePath || !existsSync(job.filePath)) return response.status(409).json({ error: 'Render job is not ready.', detail: `Current status: ${job.status}.` });
  log(`Serving file for job ${request.params.id}: ${job.filename}`);
  const buffer = await readFile(job.filePath);
  response.setHeader('Content-Type', job.contentType);
  response.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
  return response.end(buffer);
});

app.listen(PORT, () => console.log(`Print Menu Local Renderer running on http://localhost:${PORT}`));
