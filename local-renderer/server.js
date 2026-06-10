import express from 'express';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const app = express();
const PORT = Number(process.env.PORT || 3020);
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '80mb';
const JOB_TTL_MS = Number(process.env.JOB_TTL_MS || 30 * 60 * 1000);
const SPRITE_TTL_MS = Number(process.env.SPRITE_TTL_MS || 30 * 60 * 1000);
const MAX_VIDEO_FPS = Number(process.env.MAX_VIDEO_FPS || 24);
const MAX_VIDEO_DURATION = Number(process.env.MAX_VIDEO_DURATION || 32);
const MAX_VIDEO_WIDTH = Number(process.env.MAX_VIDEO_WIDTH || 1920);
const MAX_GIF_DOWNLOAD_BYTES = Number(process.env.MAX_GIF_DOWNLOAD_BYTES || 25 * 1024 * 1024);
const GIF_SPRITE_FPS = Number(process.env.GIF_SPRITE_FPS || 12);
const GIF_SPRITE_MAX_FRAMES = Number(process.env.GIF_SPRITE_MAX_FRAMES || 120);
const JPEG_FRAME_QUALITY = Number(process.env.JPEG_FRAME_QUALITY || 86);
const IMAGE_WAIT_MS = Number(process.env.IMAGE_WAIT_MS || 10000);
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_FFMPEG_PATH = process.platform === 'win32'
  ? path.join(ROOT_DIR, 'bin', 'ffmpeg.exe')
  : path.join(ROOT_DIR, 'bin', 'ffmpeg');
const FFMPEG_PATH = process.env.FFMPEG_PATH || (existsSync(BUNDLED_FFMPEG_PATH) ? BUNDLED_FFMPEG_PATH : 'ffmpeg');

const jobs = new Map();
const sprites = new Map();

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

const getRequestedDuration = (payload = {}) => {
  const directDuration = Number(payload.duration);
  if (Number.isFinite(directDuration)) return directDuration;
  const settingsDuration = Number(payload.settings?.duration);
  if (Number.isFinite(settingsDuration)) return settingsDuration;
  return 8;
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
    duration: clampNumber(getRequestedDuration(payload), 8, 1, MAX_VIDEO_DURATION),
    fps: clampNumber(payload.fps, 24, 8, MAX_VIDEO_FPS),
    filename: cleanFilename(payload.filename || `promo.${output}`).replace(/\.[^.]+$/, `.${output}`),
  };
};

const buildDocument = ({ html, width, height, duration }) => {
  if (/<!doctype\s+html|<html[\s>]/i.test(html)) return html;
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=${width}, initial-scale=1"/><style>html,body{width:${width}px;height:${height}px;margin:0;padding:0;overflow:hidden;background:#231f20}*,*::before,*::after{box-sizing:border-box}.promo-scene{transform:none!important;transform-origin:top left!important;--promo-duration:${duration}s!important}.promo-scene,.promo-scene *{animation-duration:${duration}s!important}</style></head><body>${html}</body></html>`;
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

const runFfmpeg = (args, { stdin } = {}) => new Promise((resolve, reject) => {
  const ffmpeg = spawn(FFMPEG_PATH, args, { stdio: [stdin ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
  let stderr = '';
  ffmpeg.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  ffmpeg.on('error', reject);
  ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(stderr || `ffmpeg exited with code ${code}`))));
  if (stdin) ffmpeg.stdin.end(stdin);
});

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

const createProgress = (stage, currentFrame = 0, totalFrames = 0) => {
  const safeTotal = Math.max(0, Number(totalFrames) || 0);
  const safeCurrent = Math.min(safeTotal, Math.max(0, Number(currentFrame) || 0));
  const percent = safeTotal ? Math.round((safeCurrent / safeTotal) * 100) : 0;
  return { stage, currentFrame: safeCurrent, totalFrames: safeTotal, percent };
};

const renderVideo = async ({ page, render, outputPath, onProgress }) => {
  const frameCount = Math.max(1, Math.round(render.duration * render.fps));
  log(`Rendering ${frameCount} frames for ${render.filename} (${render.width}x${render.height}, ${render.fps}fps, ${render.duration}s) using ${FFMPEG_PATH}`);
  onProgress?.(createProgress('capturing_frames', 0, frameCount));

  const ffmpeg = spawn(FFMPEG_PATH, ffmpegArgs({ output: render.output, outputPath, fps: render.fps }), { stdio: ['pipe', 'ignore', 'pipe'] });
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
      onProgress?.(createProgress('capturing_frames', i + 1, frameCount));
    }
    onProgress?.(createProgress('encoding_video', frameCount, frameCount));
    ffmpeg.stdin.end();
    await done;
    onProgress?.(createProgress('done', frameCount, frameCount));
  } catch (error) {
    ffmpeg.stdin.destroy();
    ffmpeg.kill('SIGKILL');
    throw error;
  }
};

const renderToFile = async (payload, onProgress) => {
  const render = normalizePayload(payload);
  if (!render.html) throw new Error('Missing HTML.');
  let browser;
  const workdir = await mkdtemp(path.join(tmpdir(), 'print-menu-local-render-'));
  const outputPath = path.join(workdir, render.filename);
  try {
    onProgress?.(createProgress('opening_browser', 0, 0));
    browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'] });
    const page = await createPage(browser, render);
    await renderVideo({ page, render, outputPath, onProgress });
    return { ...render, filePath: outputPath, workdir, contentType: contentType(render.output) };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};

const serializeJob = (job) => ({
  id: job.id,
  status: job.status,
  output: job.output,
  filename: job.filename,
  error: job.error,
  progress: job.progress || createProgress(job.status || 'queued', 0, 0),
  downloadUrl: job.status === 'done' ? `/jobs/${job.id}/file` : null,
});
const cleanupJob = async (id) => {
  const job = jobs.get(id);
  if (job?.workdir) await rm(job.workdir, { recursive: true, force: true }).catch(() => {});
  jobs.delete(id);
};
const runJob = async (id, payload) => {
  const job = jobs.get(id);
  if (!job) return;
  job.status = 'rendering';
  job.progress = createProgress('starting', 0, 0);
  log(`Job ${id} started`);
  try {
    Object.assign(job, await renderToFile(payload, (progress) => {
      job.progress = progress;
    }), { status: 'done', progress: createProgress('done', 1, 1) });
    log(`Job ${id} done: ${job.filename}`);
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : String(error);
    job.progress = createProgress('failed', 0, 1);
    log(`Job ${id} failed: ${job.error}`);
  }
};

const normalizeGifInputUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) throw new Error('Missing GIF URL.');
  if (!/^https?:\/\//i.test(url)) throw new Error('Only http/https GIF URLs can be converted.');
  return url;
};

const downloadGifBuffer = async (gifUrl) => {
  const response = await fetch(gifUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 Print Menu Local Renderer',
      Accept: 'image/gif,image/*,*/*;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`Could not download GIF: HTTP ${response.status}.`);

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_GIF_DOWNLOAD_BYTES) {
    throw new Error(`GIF is too large. Maximum is ${Math.round(MAX_GIF_DOWNLOAD_BYTES / 1024 / 1024)} MB.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!buffer.length) throw new Error('Downloaded GIF is empty.');
  if (buffer.length > MAX_GIF_DOWNLOAD_BYTES) {
    throw new Error(`GIF is too large. Maximum is ${Math.round(MAX_GIF_DOWNLOAD_BYTES / 1024 / 1024)} MB.`);
  }

  const signature = buffer.subarray(0, 6).toString('ascii');
  if (signature !== 'GIF87a' && signature !== 'GIF89a') {
    throw new Error('The URL did not return a valid GIF file. Use a direct .gif file URL, not a webpage link.');
  }

  return buffer;
};

const convertGifToWebm = async (gifUrl) => {
  const url = normalizeGifInputUrl(gifUrl);
  const workdir = await mkdtemp(path.join(tmpdir(), 'print-menu-gif-convert-'));
  const outputPath = path.join(workdir, 'gif-overlay.webm');
  try {
    log(`Downloading GIF overlay: ${url}`);
    const gifBuffer = await downloadGifBuffer(url);
    log(`Converting GIF overlay to WebM: ${url}`);
    await runFfmpeg([
      '-y',
      '-i', 'pipe:0',
      '-an',
      '-vf', 'fps=24,scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libvpx-vp9',
      '-deadline', 'good',
      '-cpu-used', '4',
      '-b:v', '0',
      '-crf', '32',
      '-pix_fmt', 'yuv420p',
      outputPath,
    ], { stdin: gifBuffer });
    const buffer = await readFile(outputPath);
    return { buffer, workdir };
  } catch (error) {
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
};

const cleanupSprite = async (id) => {
  const sprite = sprites.get(id);
  if (sprite?.workdir) await rm(sprite.workdir, { recursive: true, force: true }).catch(() => {});
  sprites.delete(id);
};

const convertGifToSprite = async (gifUrl) => {
  const url = normalizeGifInputUrl(gifUrl);
  const id = crypto.randomUUID();
  const workdir = await mkdtemp(path.join(tmpdir(), 'print-menu-gif-sprite-'));
  const framesDir = path.join(workdir, 'frames');
  const framePattern = path.join(framesDir, 'frame_%04d.png');
  const spritePath = path.join(workdir, 'sprite.png');

  try {
    log(`Downloading GIF overlay for sprite: ${url}`);
    const gifBuffer = await downloadGifBuffer(url);
    await mkdir(framesDir, { recursive: true });

    log(`Extracting GIF frames for sprite: ${url}`);
    await runFfmpeg([
      '-y',
      '-i', 'pipe:0',
      '-vf', `fps=${GIF_SPRITE_FPS},scale=trunc(iw/2)*2:trunc(ih/2)*2`,
      '-vframes', String(GIF_SPRITE_MAX_FRAMES),
      framePattern,
    ], { stdin: gifBuffer });

    const frameFiles = (await readdir(framesDir)).filter((file) => /^frame_\d+\.png$/i.test(file)).sort();
    const frameCount = frameFiles.length;
    if (!frameCount) throw new Error('GIF did not produce any frames.');

    log(`Building GIF sprite sheet: ${frameCount} frames`);
    await runFfmpeg([
      '-y',
      '-framerate', String(GIF_SPRITE_FPS),
      '-i', framePattern,
      '-frames:v', '1',
      '-filter_complex', `tile=${frameCount}x1:padding=0:margin=0`,
      spritePath,
    ]);

    sprites.set(id, { workdir, spritePath });
    setTimeout(() => cleanupSprite(id), SPRITE_TTL_MS).unref?.();

    return {
      id,
      spriteUrl: `http://localhost:${PORT}/gif-sprites/${id}.png`,
      frames: frameCount,
      fps: GIF_SPRITE_FPS,
      maxFrames: GIF_SPRITE_MAX_FRAMES,
      truncated: frameCount >= GIF_SPRITE_MAX_FRAMES,
      workdir,
    };
  } catch (error) {
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
};

app.get('/health', (request, response) => response.json({ ok: true, renderer: 'print-menu-local-renderer', port: PORT, ffmpegPath: FFMPEG_PATH, maxVideoWidth: MAX_VIDEO_WIDTH, maxVideoFps: MAX_VIDEO_FPS, maxVideoDuration: MAX_VIDEO_DURATION, stableCssTimeline: true, gifConversion: true, gifConversionPipe: true, gifSpriteConversion: true, gifSpriteUrl: true }));

app.post('/convert-gif', async (request, response) => {
  let result;
  try {
    result = await convertGifToWebm(request.body?.url);
    response.setHeader('Content-Type', 'video/webm');
    response.setHeader('Content-Disposition', 'attachment; filename="gif-overlay.webm"');
    response.end(result.buffer);
  } catch (error) {
    response.status(400).json({ error: 'GIF conversion failed.', detail: error instanceof Error ? error.message : String(error) });
  } finally {
    if (result?.workdir) await rm(result.workdir, { recursive: true, force: true }).catch(() => {});
  }
});

app.post('/convert-gif-sprite', async (request, response) => {
  try {
    const result = await convertGifToSprite(request.body?.url);
    response.json({
      spriteUrl: result.spriteUrl,
      frames: result.frames,
      fps: result.fps,
      maxFrames: result.maxFrames,
      truncated: result.truncated,
    });
  } catch (error) {
    response.status(400).json({ error: 'GIF sprite conversion failed.', detail: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/gif-sprites/:id.png', async (request, response) => {
  const sprite = sprites.get(request.params.id);
  if (!sprite || !existsSync(sprite.spritePath)) return response.status(404).json({ error: 'GIF sprite not found or expired.' });
  response.setHeader('Content-Type', 'image/png');
  response.setHeader('Cache-Control', 'no-store');
  return response.sendFile(sprite.spritePath);
});

app.post('/jobs', (request, response) => {
  const render = normalizePayload(request.body || {});
  if (!render.html) return response.status(400).json({ error: 'Invalid render payload.', detail: 'Missing HTML.' });
  const id = crypto.randomUUID();
  log(`Job ${id} queued: ${render.output}, ${render.width}x${render.height}, ${render.fps}fps, ${render.duration}s, html ${render.html.length} chars`);
  jobs.set(id, { id, status: 'queued', output: render.output, filename: render.filename, progress: createProgress('queued', 0, 0) });
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
