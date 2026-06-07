import html2canvas from 'html2canvas';
import { downloadHtmlRender } from '../utils/htmlVideoExport.js';

const CLIENT_WEBM_DURATION_SECONDS = 8;
const CLIENT_WEBM_FPS = 12;

export const getSafePromoFilename = (value) => String(value || 'tv-promo')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'tv-promo';

const getDocumentCss = () => Array.from(document.styleSheets)
  .map((sheet) => {
    try {
      return Array.from(sheet.cssRules ?? []).map((rule) => rule.cssText).join('\n');
    } catch (error) {
      return '';
    }
  })
  .filter(Boolean)
  .join('\n');

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const getPromoSceneSize = () => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) return { width: 1920, height: 1080 };
  const scale = Number(scene.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1) || 1;
  const rect = scene.getBoundingClientRect();
  return {
    width: Math.round(rect.width / scale) || scene.offsetWidth || 1920,
    height: Math.round(rect.height / scale) || scene.offsetHeight || 1080,
  };
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Could not read image blob.'));
  reader.readAsDataURL(blob);
});

const imageElementToDataUrl = async (sourceImage) => {
  const currentSrc = sourceImage.currentSrc || sourceImage.src || sourceImage.getAttribute('src') || '';
  if (!currentSrc || currentSrc.startsWith('data:')) return currentSrc;

  if (currentSrc.startsWith('blob:')) {
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.naturalWidth || sourceImage.width;
    canvas.height = sourceImage.naturalHeight || sourceImage.height;
    if (!canvas.width || !canvas.height) return '';
    const context = canvas.getContext('2d');
    context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  const response = await fetch(currentSrc, { mode: 'cors', cache: 'force-cache' });
  if (!response.ok) return '';
  return blobToDataUrl(await response.blob());
};

const embedImagesInClone = async (scene, clone) => {
  const sourceImages = Array.from(scene.querySelectorAll('img'));
  const clonedImages = Array.from(clone.querySelectorAll('img'));

  await Promise.all(sourceImages.map(async (sourceImage, index) => {
    const clonedImage = clonedImages[index];
    if (!clonedImage) return;

    clonedImage.removeAttribute('srcset');
    clonedImage.removeAttribute('crossorigin');
    clonedImage.removeAttribute('loading');
    clonedImage.removeAttribute('decoding');

    try {
      const dataUrl = await imageElementToDataUrl(sourceImage);
      if (dataUrl?.startsWith('data:')) clonedImage.setAttribute('src', dataUrl);
    } catch (error) {
      console.warn('Could not embed image in promo export:', error instanceof Error ? error.message : String(error));
    }
  }));
};

export const getPromoHtmlDocument = async () => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const clone = scene.cloneNode(true);
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';

  await embedImagesInClone(scene, clone);
  const { width, height } = getPromoSceneSize();

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${width}, initial-scale=1" />
    <title>TV Promo Export</title>
    <style>
      html, body {
        width: ${width}px;
        height: ${height}px;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #231f20;
      }
      *, *::before, *::after { box-sizing: border-box; }
      ${getDocumentCss()}
    </style>
  </head>
  <body>${clone.outerHTML}</body>
</html>`;
};

const withUnscaledScene = async (callback) => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const originalTransform = scene.style.transform;
  const originalTransformOrigin = scene.style.transformOrigin;
  scene.style.transform = 'none';
  scene.style.transformOrigin = 'top left';

  try {
    return await callback(scene);
  } finally {
    scene.style.transform = originalTransform;
    scene.style.transformOrigin = originalTransformOrigin;
  }
};

const renderSceneToCanvas = async () => {
  const { width, height } = getPromoSceneSize();
  return withUnscaledScene((scene) => html2canvas(scene, {
    backgroundColor: '#231f20',
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scale: 1,
    useCORS: true,
    allowTaint: true,
    logging: false,
  }));
};

const getSupportedWebmMimeType = () => {
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return types.find((type) => window.MediaRecorder?.isTypeSupported(type)) || '';
};

const downloadBrowserPng = async ({ filename, onStatus }) => {
  onStatus?.('Creating PNG in browser...');
  const canvas = await renderSceneToCanvas();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Browser could not create PNG.');
  downloadBlob(blob, filename);
};

const downloadBrowserWebm = async ({ filename, onStatus }) => {
  if (!window.MediaRecorder) throw new Error('Browser WebM export is not supported here. Try Chrome or Edge.');

  const { width, height } = getPromoSceneSize();
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const context = outputCanvas.getContext('2d');
  const stream = outputCanvas.captureStream(CLIENT_WEBM_FPS);
  const mimeType = getSupportedWebmMimeType();
  const chunks = [];
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const frameCount = CLIENT_WEBM_DURATION_SECONDS * CLIENT_WEBM_FPS;

  const done = new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error('Browser WebM export failed.'));
    recorder.onstop = resolve;
  });

  recorder.start(250);
  for (let index = 0; index < frameCount; index += 1) {
    onStatus?.(`Creating WebM in browser... ${index + 1}/${frameCount}`);
    const frameCanvas = await renderSceneToCanvas();
    context.drawImage(frameCanvas, 0, 0, width, height);
    await wait(1000 / CLIENT_WEBM_FPS);
  }
  if (recorder.state !== 'inactive') recorder.stop();
  await done;
  stream.getTracks().forEach((track) => track.stop());

  const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
  if (!blob.size) throw new Error('Browser returned an empty WebM.');
  downloadBlob(blob, filename);
};

export const downloadPromoHtml = async ({ filename }) => {
  const html = await getPromoHtmlDocument();
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), filename);
};

export const downloadPromoRender = async ({ output, filename, duration = 8, fps = 24, onStatus }) => {
  const html = await getPromoHtmlDocument();
  const { width, height } = getPromoSceneSize();

  try {
    await downloadHtmlRender({
      output,
      filename,
      format: { id: 'current', label: `${width}x${height}`, width, height },
      duration,
      fps,
      html,
      onStatus,
    });
  } catch (error) {
    console.error(error);
    if (output === 'png') {
      onStatus?.('Renderer unavailable. Trying browser PNG fallback...');
      await downloadBrowserPng({ filename, onStatus });
      return;
    }
    if (output === 'webm') {
      onStatus?.('Renderer unavailable. Trying browser WebM fallback...');
      await downloadBrowserWebm({ filename, onStatus });
      return;
    }
    throw error;
  }
};
