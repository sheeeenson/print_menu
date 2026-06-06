import express from 'express';
import { launch } from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '25mb';
const DEFAULT_CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
const IMAGE_WAIT_MS = Number(process.env.IMAGE_WAIT_MS || 10000);
const SCREENCAST_QUALITY = Number(process.env.SCREENCAST_QUALITY || 88);

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

const renderMp4ViaScreencast = async ({ page, frameDir, outputPath, duration, fps, width, height }) => {
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

  await runFfmpeg([
    '-y',
    '-framerate', effectiveFps,
    '-i', path.join(frameDir, 'frame-%05d.jpg'),
    '-t', String(duration),
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputPath,
  ]);
};

const renderMp4ViaScreenshotFallback = async ({ page, frameDir, outputPath, duration, fps }) => {
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

  await runFfmpeg([
    '-y',
    '-framerate', String(fallbackFps),
    '-i', path.join(frameDir, 'frame-%05d.jpg'),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-r', String(fallbackFps),
    outputPath,
  ]);
};

app.get('/health', (request, response) => {
  response.json({ ok: true });
});

const handleRender = async (request, response) => {
  const payload = request.body || {};
  const format = payload.format || {};
  const width = getNumber(format.width, 1920, 320, 3840);
  const height = getNumber(format.height, 1080, 320, 3840);
  const duration = getNumber(payload.duration, 8, 1, 30);
  const fps = getNumber(payload.fps, 24, 12, 30);
  const output = payload.output === 'png' ? 'png' : 'mp4';
  const fallbackName = output === 'png' ? 'promo.png' : 'promo.mp4';
  const filename = sanitizeFilename(payload.filename || fallbackName).replace(/\.[^.]+$/, `.${output}`);
  const html = String(payload.html || '').trim();

  if (!html) {
    response.status(400).json({ error: 'Invalid render payload.', detail: 'Missing HTML.' });
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
        '--autoplay-policy=no-user-gesture-required',
      ],
      defaultViewport: { width, height, deviceScaleFactor: 1 },
      executablePath: DEFAULT_CHROMIUM_PATH,
      headless: 'new',
    });

    const page = await createPage(browser, { html, width, height, duration });

    if (output === 'png') {
      await freezeAnimationsAt(page, 0);
      const imageBuffer = await page.screenshot({
        type: 'png',
        omitBackground: false,
        clip: { x: 0, y: 0, width, height },
      });

      response.status(200);
      response.setHeader('Content-Type', 'image/png');
      response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      response.end(imageBuffer);
      return;
    }

    try {
      await renderMp4ViaScreencast({ page, frameDir, outputPath, duration, fps, width, height });
    } catch (screencastError) {
      console.warn('Screencast render failed, using screenshot fallback:', screencastError instanceof Error ? screencastError.message : String(screencastError));
      await rm(frameDir, { recursive: true, force: true }).catch(() => {});
      await mkdir(frameDir, { recursive: true });
      await renderMp4ViaScreenshotFallback({ page, frameDir, outputPath, duration, fps });
    }

    const videoBuffer = await readFile(outputPath);
    response.status(200);
    response.setHeader('Content-Type', 'video/mp4');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.end(videoBuffer);
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: `Unable to render ${output.toUpperCase()}.`,
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
    await rm(workdir, { recursive: true, force: true }).catch(() => {});
  }
};

app.post('/render', handleRender);
app.post('/html-to-mp4', (request, response) => {
  request.body = { ...(request.body || {}), output: 'mp4' };
  return handleRender(request, response);
});

app.listen(PORT, () => {
  console.log(`Promo renderer listening on port ${PORT}`);
});
