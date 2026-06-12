import express from 'express';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const app = express();
const PORT = Number(process.env.PORT || 3020);
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '80mb';
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

const waitForRenderReady = async (page) => {
  await Promise.race([
    page.waitForFunction(() => window.__PROMO_RENDER_READY__ === true, null, { timeout: RENDER_READY_WAIT_MS }).catch(() => undefined),
    wait(RENDER_READY_WAIT_MS),
  ]);
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

const waitForVideos = async (page) => {
  await Promise.race([
    page.evaluate(async () => {
      const videos = Array.from(document.querySelectorAll('video'));
      await Promise.all(videos.map((video) => new Promise((resolve) => {
        const finish = () => {
          video.removeEventListener('loadedmetadata', finish);
          video.removeEventListener('loadeddata', finish);
          video.removeEventListener('canplay', finish);
          video.removeEventListener('error', finish);
          resolve();
        };

        try {
          video.muted = true;
          video.loop = true;
          video.autoplay = true;
          video.playsInline = true;
          video.setAttribute('muted', 'true');
          video.setAttribute('loop', 'true');
          video.setAttribute('autoplay', 'true');
          video.setAttribute('playsinline', 'true');
          video.setAttribute('preload', 'auto');
          video.load?.();
          const playPromise = video.play?.();
          if (playPromise?.catch) playPromise.catch(() => undefined);
        } catch (error) {
          // Continue to event wait / timeout.
        }

        if (video.readyState >= 2) {
          finish();
          return;
        }

        video.addEventListener('loadedmetadata', finish, { once: true });
        video.addEventListener('loadeddata', finish, { once: true });
        video.addEventListener('canplay', finish, { once: true });
        video.addEventListener('error', finish, { once: true });
      })));
    }).catch(() => undefined),
    wait(VIDEO_WAIT_MS),
  ]);

  const diagnostics = await page.evaluate(() => Array.from(document.querySelectorAll('video')).map((video, index) => ({
    index,
    className: video.className || '',
    readyState: video.readyState,
    currentTime: Number(video.currentTime || 0),
    duration: Number.isFinite(video.duration) ? video.duration : null,
    src: (video.currentSrc || video.src || '').slice(0, 140),
  }))).catch(() => []);
  if (diagnostics.length) log(`Video diagnostics: ${JSON.stringify(diagnostics)}`);
};

const createPage = async (browser, render) => {
  const page = await browser.newPage({ viewport: { width: render.width, height: render.height }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(0);
  page.setDefaultNavigationTimeout(0);
  await page.setContent(buildDocument(render), { waitUntil: 'domcontentloaded', timeout: 0 });
  await waitForRenderReady(page);
  await waitForImages(page);
  await waitForVideos(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  return page;
};

const seekCssAnimations = async (page, milliseconds) => {
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

const seekVideoOverlays = async (page, seconds) => {
  await page.evaluate(async ({ time, timeout }) => {
    const videos = Array.from(document.querySelectorAll('video'));
    await Promise.all(videos.map((video) => new Promise((resolve) => {
      let finished = false;
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onReady);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', finish);
      };
      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        cleanup();
        resolve();
      };
      const onSeeked = () => finish();
      const seek = () => {
        try {
          video.pause();
          video.muted = true;
          video.playsInline = true;
          const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
          const targetTime = duration ? Math.min(Math.max(0.04, time % duration), Math.max(0.04, duration - 0.04)) : Math.max(0.04, time);
          video.addEventListener('seeked', onSeeked, { once: true });
          if (Math.abs((video.currentTime || 0) - targetTime) < 0.01 && video.readyState >= 2) {
            finish();
            return;
          }
          video.currentTime = targetTime;
        } catch (error) {
          finish();
        }
      };
      const onReady = () => seek();
      const timer = window.setTimeout(finish, timeout);

      try {
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('muted', 'true');
        video.setAttribute('playsinline', 'true');
        video.load?.();
        if (video.readyState >= 1) {
          seek();
          return;
        }
        video.addEventListener('loadedmetadata', onReady, { once: true });
        video.addEventListener('loadeddata', onReady, { once: true });
        video.addEventListener('canplay', onReady, { once: true });
        video.addEventListener('error', finish, { once: true });
      } catch (error) {
        finish();
      }
    })));
  }, { time: seconds, timeout: MEDIA_SEEK_TIMEOUT_MS });
};

const seekFrame = async (page, seconds) => {
  await seekCssAnimations(page, seconds * 1000);
  await seekVideoOverlays(page, seconds);
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
  const input = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', 'pipe:0', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2'];
  if (output === 'webm') return [...input, '-c:v', 'libvpx-vp9', '-deadline', 'good', '-cpu-used', '4', '-b:v', '0', '-crf', '28', '-pix_fmt', 'yuv420p', outputPath];
  return [...input, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outputPath];
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

const dataUrlToBuffer = (value = '') => {
  const match = String(value).match(/^data:([^;,]+)?(;base64)?,(.*)$/);
  if (!match) throw new Error('Invalid data URL.');
  const isBase64 = Boolean(match[2]);
  const data = match[3] || '';
  return isBase64 ? Buffer.from(data, 'base64') : Buffer.from(decodeURIComponent(data));
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
      await seekFrame(page, i / render.fps);
      const frame = await page.screenshot({ type: 'png', omitBackground: false, clip: { x: 0, y: 0, width: render.width, height: render.height } });
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

const convertGifBufferToWebm = async (gifBuffer, label = 'gif-overlay') => {
  const workdir = await mkdtemp(path.join(tmpdir(), 'print-menu-gif-convert-'));
  const outputPath = path.join(workdir, `${label}.webm`);
  try {
    await runFfmpeg([
      '-y',
      '-i', 'pipe:0',
      '-an',
      '-vf', 'fps=24,scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libvpx-vp9',
      '-deadline', 'good',
      '-cpu-used', '4',
      '-b:v', '0',
      '-crf', '30',
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

const convertGifToWebm = async (gifUrl) => {
  const url = normalizeGifInputUrl(gifUrl);
  log(`Downloading GIF overlay: ${url}`);
  const gifBuffer = await downloadGifBuffer(url);
  log(`Converting GIF overlay to WebM: ${url}`);
  return convertGifBufferToWebm(gifBuffer, 'gif-overlay');
};

const replaceGifImagesWithVideos = async (page) => {
  const gifImages = await page.evaluate(() => Array.from(document.querySelectorAll('img.promo-gif-overlay[src], img.promo-background-media[src]')).map((image, index) => ({
    index,
    src: image.currentSrc || image.src || image.getAttribute('src') || '',
  })));

  for (const image of gifImages) {
    let result;
    try {
      const gifBuffer = image.src.startsWith('data:image/gif') ? dataUrlToBuffer(image.src) : await downloadGifBuffer(image.src);
      result = await convertGifBufferToWebm(gifBuffer, `gif-render-${image.index}`);
      const dataUrl = `data:video/webm;base64,${result.buffer.toString('base64')}`;
      await page.evaluate(({ index, src }) => {
        const images = Array.from(document.querySelectorAll('img.promo-gif-overlay[src], img.promo-background-media[src]'));
        const image = images[index];
        if (!image) return;
        const video = document.createElement('video');
        Array.from(image.attributes || []).forEach((attribute) => {
          if (['src', 'srcset', 'alt', 'loading', 'decoding', 'crossorigin'].includes(attribute.name)) return;
          video.setAttribute(attribute.name, attribute.value);
        });
        video.className = image.className;
        video.style.cssText = image.style.cssText;
        video.src = src;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute('muted', 'true');
        video.setAttribute('loop', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('preload', 'auto');
        video.setAttribute('aria-hidden', 'true');
        video.setAttribute('data-promo-gif-converted-video', 'true');
        image.replaceWith(video);
      }, { index: image.index, src: dataUrl });
      log(`Converted GIF image ${image.index + 1} to seekable video for render.`);
    } catch (error) {
      log(`Skipped GIF image ${image.index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (result?.workdir) await rm(result.workdir, { recursive: true, force: true }).catch(() => {});
    }
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
    await replaceGifImagesWithVideos(page);
    await waitForImages(page);
    await waitForVideos(page);
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

const getGoogleDriveDownloadUrl = (fileId) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

app.get('/drive-media/:fileId', async (request, response) => {
  try {
    const fileId = String(request.params.fileId || '').trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) return response.status(400).json({ error: 'Invalid Google Drive file id.' });

    const headers = {
      'User-Agent': 'Mozilla/5.0 Print Menu Local Renderer',
      Accept: 'video/mp4,video/webm,video/*,*/*;q=0.8',
    };
    if (request.headers.range) headers.Range = request.headers.range;

    const upstream = await fetch(getGoogleDriveDownloadUrl(fileId), { redirect: 'follow', headers });
    if (!upstream.ok && upstream.status !== 206) {
      return response.status(upstream.status).json({ error: 'Google Drive media proxy failed.', detail: `HTTP ${upstream.status}` });
    }

    response.status(upstream.status === 206 ? 206 : 200);
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
    response.setHeader('Accept-Ranges', upstream.headers.get('accept-ranges') || 'bytes');
    const contentLength = upstream.headers.get('content-length');
    const contentRange = upstream.headers.get('content-range');
    if (contentLength) response.setHeader('Content-Length', contentLength);
    if (contentRange) response.setHeader('Content-Range', contentRange);
    response.setHeader('Cache-Control', 'public, max-age=3600');

    const buffer = Buffer.from(await upstream.arrayBuffer());
    return response.end(buffer);
  } catch (error) {
    return response.status(500).json({ error: 'Google Drive media proxy failed.', detail: error instanceof Error ? error.message : String(error) });
  }
});

app.get('/health', (request, response) => response.json({ ok: true, renderer: 'print-menu-local-renderer', port: PORT, ffmpegPath: FFMPEG_PATH, maxVideoWidth: MAX_VIDEO_WIDTH, maxVideoFps: MAX_VIDEO_FPS, maxVideoDuration: MAX_VIDEO_DURATION, stableCssTimeline: true, gifConversion: true, gifConversionPipe: true, seekableVideoOverlayCapture: true, pngFramePipe: true, gifBackgroundConversion: true, driveMediaProxy: true, apiPromoRenderBlob: true, videoWait: true, renderReadyWait: true }));

app.post('/api/promo-render', async (request, response) => {
  let result;
  try {
    result = await renderToFile(request.body || {}, (progress) => {
      if (progress?.currentFrame === 1 || progress?.percent === 100 || progress?.currentFrame % 24 === 1) {
        // Progress is already logged from renderVideo; this hook keeps API mode compatible.
      }
    });
    const buffer = await readFile(result.filePath);
    if (!buffer.length) return response.status(500).json({ error: 'Render failed.', detail: 'Renderer produced an empty file.' });
    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    response.setHeader('Content-Length', String(buffer.length));
    return response.end(buffer);
  } catch (error) {
    return response.status(500).json({ error: 'Render failed.', detail: error instanceof Error ? error.message : String(error) });
  } finally {
    if (result?.workdir) await rm(result.workdir, { recursive: true, force: true }).catch(() => {});
  }
});

app.post('/convert-gif', async (request, response) => {
  let result;
  try {
    if (request.body?.dataUrl) {
      result = await convertGifBufferToWebm(dataUrlToBuffer(request.body.dataUrl), 'gif-overlay');
    } else {
      result = await convertGifToWebm(request.body?.url);
    }
    response.setHeader('Content-Type', 'video/webm');
    response.setHeader('Content-Disposition', 'attachment; filename="gif-overlay.webm"');
    response.end(result.buffer);
  } catch (error) {
    response.status(400).json({ error: 'GIF conversion failed.', detail: error instanceof Error ? error.message : String(error) });
  } finally {
    if (result?.workdir) await rm(result.workdir, { recursive: true, force: true }).catch(() => {});
  }
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
