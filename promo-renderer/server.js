import express from 'express';
import { launch } from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '25mb';
const DEFAULT_CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
const IMAGE_WAIT_MS = Number(process.env.IMAGE_WAIT_MS || 10000);
const SCREENCAST_QUALITY = Number(process.env.SCREENCAST_QUALITY || 88);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const JOB_TTL_MS = Number(process.env.JOB_TTL_MS || 20 * 60 * 1000);

const jobs = new Map();

app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition,Content-Type');
  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }
  next();
});
app.use(express.json({ limit: MAX_BODY_SIZE }));

const sanitizeFilename = (filename = 'promo.mp4') => String(filename)
  .replace(/[^a-zA-Z0-9._-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '') || 'promo.mp4';

const getNumber = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const isFullHtmlDocument = (html) => /<!doctype\s+html|<html[\s>]/i.test(html);

const getOutput = (value) => {
  if (value === 'png') return 'png';
  if (value === 'webm') return 'webm';
  return 'mp4';
};

const getContentType = (output) => {
  if (output === 'png') return 'image/png';
  if (output === 'webm') return 'video/webm';
  return 'video/mp4';
};

const buildDocument = ({ html, width, height, duration }) => {
  if (isFullHtmlDocument(html)) return html;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${width}, initial-scale=1" />
    <style>
      html, body {
        width: ${width}px;
        height: ${height}px;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: transparent;
      }
      *, *::before, *::after { box-sizing: border-box; }
      .promo-scene { transform: none !important; transform-origin: top left !important; }
      .promo-scene, .promo-scene * { animation-duration: var(--promo-duration, ${duration}s); }
    </style>
  </head>
  <body>${html}</body>
</html>`;
};

const runFfmpeg = (args) => new Promise((resolve, reject) => {
  const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';

  ffmpeg.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  ffmpeg.on('error', reject);
  ffmpeg.on('close', (code) => {
    if (code === 0) resolve();
    else reject(new Error(stderr || `ffmpeg exited with code ${code}`));
  });
});

const waitForImages = async (page) => {
  try {
    await Promise.race([
      page.evaluate(async () => {
        const images = Array.from(document.images || []);
        await Promise.all(images.map(async (image) => {
          if (image.complete && image.naturalWidth > 0) return;
          if (typeof image.decode === 'function') {
            await image.decode().catch(() => undefined);
            return;
          }
          await new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
          });
        }));
      }),
      wait(IMAGE_WAIT_MS),
    ]);
  } catch (error) {
    console.warn('Image wait skipped:', error instanceof Error ? error.message : String(error));
  }
};

const freezeAnimationsAt = async (page, seconds) => {
  await page.evaluate((time) => {
    const elements = [document.documentElement, document.body, ...document.querySelectorAll('*')];
    elements.forEach((element) => {
      const style = window.getComputedStyle(element);
      if (!style.animationName || style.animationName === 'none') return;
      const count = style.animationName.split(',').length;
      element.style.animationPlayState = Array.from({ length: count }, () => 'paused').join(',');
      element.style.animationDelay = Array.from({ length: count }, () => `-${time}s`).join(',');
    });
  }, seconds);
};

const resetAndPlayAnimations = async (page) => {
  await page.evaluate(() => {
    document.getAnimations({ subtree: true }).forEach((animation) => {
      try {
        animation.cancel();
        animation.play();
      } catch (error) {
        // Ignore animations that cannot be controlled by the Web Animations API.
      }
    });
  });
};

const createPage = async (browser, { html, width, height, duration }) => {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0);
  page.setDefaultTimeout(0);
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(buildDocument({ html, width, height, duration }), { waitUntil: 'domcontentloaded', timeout: 0 });
  await waitForImages(page);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  return page;
};

const getVideoFfmpegArgs = ({ output, inputPattern, outputPath, duration, fps }) => {
  if (output === 'webm') {
    return [
      '-y',
      '-framerate', String(fps),
      '-i', inputPattern,
      '-t', String(duration),
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libvpx-vp9',
      '-b:v', '0',
      '-crf', '32',
      '-pix_fmt', 'yuv420p',
      outputPath,
    ];
  }

  return [
    '-y',
    '-framerate', String(fps),
    '-i', inputPattern,
    '-t', String(duration),
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputPath,
  ];
};

const renderVideoViaScreencast = async ({ page, frameDir, outputPath, output, duration, fps, width, height }) => {
  const client = await page.target().createCDPSession();
  const targetFrameIntervalMs = 1000 / fps;
  const pendingWrites = new Set();
  let frameIndex = 0;
  let firstTimestamp = null;
  let lastSavedElapsedMs = -targetFrameIntervalMs;
  let stopped = false;

  const saveFrame = (data) => {
    const framePath = path.join(frameDir, `frame-${String(frameIndex).padStart(5, '0')}.jpg`);
    frameIndex += 1;
    const promise = writeFile(framePath, Buffer.from(data, 'base64')).finally(() => pendingWrites.delete(promise));
    pendingWrites.add(promise);
  };

  client.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    try {
      await client.send('Page.screencastFrameAck', { sessionId });
    } catch (error) {
      // The stream can already be stopped while a late frame arrives.
    }

    if (stopped) return;
    const timestamp = Number(metadata?.timestamp || 0);
    if (!firstTimestamp) firstTimestamp = timestamp || Date.now() / 1000;
    const elapsedMs = Math.max(0, ((timestamp || Date.now() / 1000) - firstTimestamp) * 1000);

    if (elapsedMs + 1 >= lastSavedElapsedMs + targetFrameIntervalMs) {
      lastSavedElapsedMs = elapsedMs;
      saveFrame(data);
    }
  });

  await resetAndPlayAnimations(page);
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: getNumber(SCREENCAST_QUALITY, 88, 50, 100),
    maxWidth: width,
    maxHeight: height,
    everyNthFrame: 1,
  });

  await wait(Math.ceil(duration * 1000) + 350);
  stopped = true;
  await client.send('Page.stopScreencast').catch(() => undefined);
  await Promise.all([...pendingWrites]);

  if (frameIndex < Math.max(2, Math.round(duration * 8))) {
    throw new Error(`Screencast captured too few frames: ${frameIndex}.`);
  }

  const effectiveFps = Math.max(1, frameIndex / duration).toFixed(3);
  await runFfmpeg(getVideoFfmpegArgs({
    output,
    inputPattern: path.join(frameDir, 'frame-%05d.jpg'),
    outputPath,
    duration,
    fps: effectiveFps,
  }));
};

const renderVideoViaScreenshotFallback = async ({ page, frameDir, outputPath, output, duration, fps }) => {
  const fallbackFps = Math.min(fps, 18);
  const frameCount = Math.max(1, Math.round(duration * fallbackFps));
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const seconds = frameIndex / fallbackFps;
    await freezeAnimationsAt(page, seconds);

    await page.screenshot({
      path: path.join(frameDir, `frame-${String(frameIndex).padStart(5, '0')}.jpg`),
      type: 'jpeg',
      quality: 84,
      omitBackground: false,
    });
  }

  await runFfmpeg(getVideoFfmpegArgs({
    output,
    inputPattern: path.join(frameDir, 'frame-%05d.jpg'),
    outputPath,
    duration,
    fps: fallbackFps,
  }));
};

const normalizeRenderPayload = (payload = {}) => {
  const format = payload.format || {};
  const output = getOutput(payload.output);
  const fallbackName = output === 'png' ? 'promo.png' : `promo.${output}`;
  return {
    width: getNumber(format.width, 1920, 320, 3840),
    height: getNumber(format.height, 1080, 320, 3840),
    duration: getNumber(payload.duration, 8, 1, 30),
    fps: getNumber(payload.fps, 24, 12, 30),
    output,
    filename: sanitizeFilename(payload.filename || fallbackName).replace(/\.[^.]+$/, `.${output}`),
    html: String(payload.html || '').trim(),
  };
};

const renderToFile = async (payload) => {
  const render = normalizeRenderPayload(payload);
  if (!render.html) throw new Error('Missing HTML.');

  let browser;
  const workdir = await mkdtemp(path.join(tmpdir(), 'promo-render-'));
  const frameDir = path.join(workdir, 'frames');
  const outputPath = path.join(workdir, render.filename);

  try {
    await mkdir(frameDir, { recursive: true });

    browser = await launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--hide-scrollbars',
        '--autoplay-policy=no-user-gesture-required',
      ],
      defaultViewport: { width: render.width, height: render.height, deviceScaleFactor: 1 },
      executablePath: DEFAULT_CHROMIUM_PATH,
      headless: 'new',
    });

    const page = await createPage(browser, render);

    if (render.output === 'png') {
      await freezeAnimationsAt(page, 0);
      const imageBuffer = await page.screenshot({
        type: 'png',
        omitBackground: false,
        clip: { x: 0, y: 0, width: render.width, height: render.height },
      });
      await writeFile(outputPath, imageBuffer);
    } else {
      try {
        await renderVideoViaScreencast({
          page,
          frameDir,
          outputPath,
          output: render.output,
          duration: render.duration,
          fps: render.fps,
          width: render.width,
          height: render.height,
        });
      } catch (screencastError) {
        console.warn('Screencast render failed, using screenshot fallback:', screencastError instanceof Error ? screencastError.message : String(screencastError));
        await rm(frameDir, { recursive: true, force: true }).catch(() => {});
        await mkdir(frameDir, { recursive: true });
        await renderVideoViaScreenshotFallback({
          page,
          frameDir,
          outputPath,
          output: render.output,
          duration: render.duration,
          fps: render.fps,
        });
      }
    }

    return {
      output: render.output,
      filename: render.filename,
      contentType: getContentType(render.output),
      filePath: outputPath,
      workdir,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};

const cleanupJob = async (jobId) => {
  const job = jobs.get(jobId);
  if (!job) return;
  if (job.workdir) await rm(job.workdir, { recursive: true, force: true }).catch(() => {});
  jobs.delete(jobId);
};

const scheduleCleanup = (jobId) => {
  setTimeout(() => cleanupJob(jobId), JOB_TTL_MS).unref?.();
};

const serializeJob = (job) => ({
  id: job.id,
  status: job.status,
  output: job.output,
  filename: job.filename,
  error: job.error,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  downloadUrl: job.status === 'done' ? `/jobs/${job.id}/file` : null,
});

const runJob = async (jobId, payload) => {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = 'rendering';
  job.updatedAt = new Date().toISOString();

  try {
    const result = await renderToFile(payload);
    Object.assign(job, result, {
      status: 'done',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : String(error);
    job.updatedAt = new Date().toISOString();
  }
};

app.get('/health', (request, response) => {
  response.json({ ok: true });
});

app.post('/jobs', (request, response) => {
  const payload = request.body || {};
  const render = normalizeRenderPayload(payload);
  if (!render.html) {
    response.status(400).json({ error: 'Invalid render payload.', detail: 'Missing HTML.' });
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  jobs.set(id, {
    id,
    status: 'queued',
    output: render.output,
    filename: render.filename,
    createdAt: now,
    updatedAt: now,
  });
  scheduleCleanup(id);
  setImmediate(() => runJob(id, payload));
  response.status(202).json(serializeJob(jobs.get(id)));
});

app.get('/jobs/:id', (request, response) => {
  const job = jobs.get(request.params.id);
  if (!job) {
    response.status(404).json({ error: 'Render job not found.' });
    return;
  }
  response.json(serializeJob(job));
});

app.get('/jobs/:id/file', async (request, response) => {
  const job = jobs.get(request.params.id);
  if (!job) {
    response.status(404).json({ error: 'Render job not found.' });
    return;
  }
  if (job.status !== 'done' || !job.filePath || !existsSync(job.filePath)) {
    response.status(409).json({ error: 'Render job is not ready.', detail: `Current status: ${job.status}.` });
    return;
  }

  const buffer = await readFile(job.filePath);
  response.status(200);
  response.setHeader('Content-Type', job.contentType);
  response.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
  response.end(buffer);
});

app.post('/render', async (request, response) => {
  try {
    const result = await renderToFile(request.body || {});
    const buffer = await readFile(result.filePath);
    response.status(200);
    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    response.end(buffer);
    await rm(result.workdir, { recursive: true, force: true }).catch(() => {});
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: 'Unable to render export.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/html-to-mp4', (request, response) => {
  request.body = { ...(request.body || {}), output: 'mp4' };
  return app._router.handle(request, response, () => {});
});
app.post('/html-to-webm', (request, response) => {
  request.body = { ...(request.body || {}), output: 'webm' };
  return app._router.handle(request, response, () => {});
});

app.listen(PORT, () => {
  console.log(`Promo renderer listening on port ${PORT}`);
});
