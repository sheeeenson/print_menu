import express from 'express';
import { launch } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_SIZE = process.env.MAX_BODY_SIZE || '25mb';

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

const getExecutablePath = async () => {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  return chromium.executablePath();
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
  try {
    browser = await launch({
      args: chromium.args,
      defaultViewport: { width, height, deviceScaleFactor: 1 },
      executablePath: await getExecutablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(buildDocument({ html, width, height, duration }), { waitUntil: 'networkidle0' });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

    const stream = await page.screencast({
      path: undefined,
      format: 'mp4',
      fps,
      scale: 1,
    });

    await new Promise((resolve) => setTimeout(resolve, duration * 1000));
    const videoBuffer = await stream.stop();

    response.status(200);
    response.setHeader('Content-Type', 'video/mp4');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.end(Buffer.from(videoBuffer));
  } catch (error) {
    console.error(error);
    response.status(500).json({
      error: 'Unable to render MP4.',
      detail: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

app.listen(PORT, () => {
  console.log(`Promo renderer listening on port ${PORT}`);
});
