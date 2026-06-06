import express from 'express';
import { launch } from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '25mb';
const DEFAULT_CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

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

const buildDocument = ({ html, width, height, duration }) => `<!doctype html>
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
      *, *::before, *::after {
        box-sizing: border-box;
      }
      .promo-scene {
        transform: none !important;
        transform-origin: top left !important;
      }
      .promo-scene, .promo-scene * {
        animation-duration: var(--promo-duration, ${duration}s);
      }
    </style>
  </head>
  <body>${html}</body>
</html>`;

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

app.get('/health', (request, response) => {
  response.json({ ok: true });
});

app.post('/render', async (request, response) => {
  const payload = request.body || {};
  const format = payload.format || {};
  const width = getNumber(format.width, 1920, 320, 3840);
  const height = getNumber(format.height, 1080, 320, 3840);
  const duration = getNumber(payload.duration, 8, 1, 30);
  const fps = getNumber(payload.fps, 30, 12, 60);
  const filename = sanitizeFilename(payload.filename || 'promo.mp4').replace(/\.[^.]+$/, '.mp4');
  const html = String(payload.html || '');

  if (!html.includes('promo-scene')) {
    response.status(400).json({ error: 'Invalid render payload.', detail: 'Missing promo-scene HTML.' });
    return;
  }

  let browser;
  const workdir = await mkdtemp(path.join(tmpdir(), 'promo-render-'));
  const frameDir = path.join(workdir, 'frames');
  const outputPath = path.join(workdir, filename);

  try {
    await mkdir(frameDir, { recursive: true });

    browser = await launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--hide-scrollbars',
      ],
      defaultViewport: { width, height, deviceScaleFactor: 1 },
      executablePath: DEFAULT_CHROMIUM_PATH,
      headless: 'new',
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(buildDocument({ html, width, height, duration }), { waitUntil: 'networkidle0' });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

    const frameCount = Math.max(1, Math.round(duration * fps));
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const seconds = frameIndex / fps;
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

      await page.screenshot({
        path: path.join(frameDir, `frame-${String(frameIndex).padStart(5, '0')}.png`),
        type: 'png',
        omitBackground: false,
        clip: { x: 0, y: 0, width, height },
      });
    }

    await runFfmpeg([
      '-y',
      '-framerate', String(fps),
      '-i', path.join(frameDir, 'frame-%05d.png'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-r', String(fps),
      outputPath,
    ]);

    const videoBuffer = await readFile(outputPath);
    response.status(200);
    response.setHeader('Content-Type', 'video/mp4');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.end(videoBuffer);
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: 'Unable to render MP4.',
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
});

app.listen(PORT, () => {
  console.log(`Promo renderer listening on port ${PORT}`);
});
