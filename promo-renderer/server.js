import express from 'express';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '35mb';
const IMAGE_WAIT_MS = Number(process.env.IMAGE_WAIT_MS || 10000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const JOB_TTL_MS = Number(process.env.JOB_TTL_MS || 20 * 60 * 1000);
const MAX_VIDEO_FPS = Number(process.env.MAX_VIDEO_FPS || 24);
const MAX_VIDEO_DURATION = Number(process.env.MAX_VIDEO_DURATION || 15);

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

const createPage = async (browser, render) => {
  const page = await browser.newPage({
    viewport: { width: render.width, height: render.height },
    deviceScaleFactor: 1,
  });
  page.setDefaultNavigationTimeout(0);
  page.setDefaultTimeout(0);
  await page.setContent(buildDocument(render), { waitUntil: 'domcontentloaded', timeout: 0 });
  await waitForImages(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  return page;
};

const restartAnimations = async (page) => {
  await page.evaluate(() => {
    document.getAnimations({ subtree: true }).forEach((animation) => {
      try {
        animation.cancel();
        animation.play();
      } catch (error) {
        // Ignore non-controllable animations.
      }
    });
  });
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

const capturePng = async ({ page, outputPath, width, height }) => {
  await seekAnimations(page, 0);
  const buffer = await page.screenshot({
    type: 'png',
    omitBackground: false,
    clip: { x: 0, y: 0, width, height },
  });
  await writeFile(outputPath, buffer);
};

const getVideoFfmpegArgs = ({ output, inputPattern, outputPath, fps }) => {
  if (output === 'webm') {
    return [
      '-y',
      '-framerate', String(fps),
      '-i', inputPattern,
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
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputPath,
  ];
};

const captureVideoFrames = async ({ page, frameDir, duration, fps, width, height }) => {
  const frameCount = Math.max(1, Math.round(duration * fps));
  await restartAnimations(page);

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const milliseconds = (frameIndex / fps) * 1000;
    await seekAnimations(page, milliseconds);
    await page.screenshot({
      path: path.join(frameDir, `frame-${String(frameIndex).padStart(5, '0')}.png`),
      type: 'png',
      omitBackground: false,
      clip: { x: 0, y: 0, width, height },
    });
  }
};

const captureVideo = async ({ page, frameDir, outputPath, output, duration, fps, width, height }) => {
  await captureVideoFrames({ page, frameDir, duration, fps, width, height });
  await runFfmpeg(getVideoFfmpegArgs({
    output,
    inputPattern: path.join(frameDir, 'frame-%05d.png'),
    outputPath,
    fps,
  }));
};

const normalizeRenderPayload = (payload = {}) => {
  const format = payload.format || {};
  const output = getOutput(payload.output);
  const fallbackName = output === 'png' ? 'promo.png' : `promo.${output}`;
  return {
    width: getNumber(format.width, 1920, 320, 3840),
    height: getNumber(format.height, 1080, 320, 3840),
    duration: getNumber(payload.duration, 8, 1, MAX_VIDEO_DURATION),
    fps: getNumber(payload.fps, 24, 8, MAX_VIDEO_FPS),
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

    browser = await chromium.launch({
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--hide-scrollbars',
        '--autoplay-policy=no-user-gesture-required',
      ],
    });

    const page = await createPage(browser, render);

    if (render.output === 'png') {
      await capturePng({ page, outputPath, width: render.width, height: render.height });
    } else {
      await captureVideo({
        page,
        frameDir,
        outputPath,
        output: render.output,
        duration: render.duration,
        fps: render.fps,
        width: render.width,
        height: render.height,
      });
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

const handleRenderRequest = async (request, response) => {
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
};

app.get('/health', (request, response) => {
  response.json({ ok: true, renderer: 'playwright-frame-capture' });
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

app.post('/render', handleRenderRequest);
app.post('/html-to-mp4', (request, response) => {
  request.body = { ...(request.body || {}), output: 'mp4' };
  return handleRenderRequest(request, response);
});
app.post('/html-to-webm', (request, response) => {
  request.body = { ...(request.body || {}), output: 'webm' };
  return handleRenderRequest(request, response);
});

app.listen(PORT, () => {
  console.log(`Promo renderer listening on port ${PORT}`);
});
