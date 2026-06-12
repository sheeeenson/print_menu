import html2canvas from 'html2canvas';
import { downloadHtmlRender } from '../utils/htmlVideoExport.js';

const LOCAL_RENDERER_BASE_URL = 'http://localhost:3020';
const LOCAL_RENDERER_DOWNLOAD_FOLDER_URL = 'https://drive.google.com/drive/folders/1mFt6XpH5MhlYH48TlJ37y9O1VtGU4e3D?usp=sharing';
const LOCAL_RENDERER_MAC_URL = 'https://drive.google.com/uc?export=download&id=19yrHrnwx2JziRZHJTBN_PJ8MiJxbaspC';
const LOCAL_RENDERER_WINDOWS_URL = 'https://drive.google.com/uc?export=download&id=1SkuHoZssolnEIva_7oJpiGbrQ9SQ14_Q';
const ALLOWED_DURATIONS = [8, 16, 32];
const GIF_URL_PATTERN = /\.gif(?:[?#].*)?$/i;
const GIF_EXPORT_IMAGE_SELECTOR = 'img.promo-gif-overlay[src], img.promo-background-media[src]';
const PROMO_MEDIA_EXPORT_ID = 'data-promo-export-id';
const PROMO_DISH_IMAGE_SELECTOR = 'img.promo-dish-image';
const PROMO_BACKGROUND_MEDIA_SELECTOR = '.promo-background-media';
const PROMO_GIF_OVERLAY_SELECTOR = 'img.promo-gif-overlay[src]';
const GOOGLE_DRIVE_FILE_ID_PATTERNS = Object.freeze([
  /\/drive-media\/([a-zA-Z0-9_-]+)/,
  /\/file\/d\/([a-zA-Z0-9_-]+)/,
  /[?&]id=([a-zA-Z0-9_-]+)/,
  /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
]);

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

const getSafeFilename = (value) => String(value || 'tv-promo')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'tv-promo';

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

const getCurrentPromoTitle = () => document.querySelector('.promo-generator-toolbar h2')?.textContent || 'tv-promo';
const getPromoFormatLabel = () => document.querySelector('.promo-output-pill')?.textContent?.trim() || 'promo';

const getSelectedDuration = () => {
  const durationGroup = Array.from(document.querySelectorAll('.promo-panel-group'))
    .find((group) => group.querySelector('h3')?.textContent?.trim() === 'Duration');
  const activeButton = durationGroup?.querySelector('.promo-duration-buttons button.active');
  const activeValue = Number(activeButton?.textContent?.replace(/[^0-9]/g, ''));
  if (ALLOWED_DURATIONS.includes(activeValue)) return activeValue;
  return 8;
};

const getSceneScale = (scene) => Number(scene.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1) || 1;

const setDownloadStatus = (downloadGroup, message) => {
  const status = downloadGroup?.querySelector('.promo-preview-size');
  if (status) status.textContent = message;
};

const getSceneSize = (scene) => {
  const scale = getSceneScale(scene);
  const rect = scene.getBoundingClientRect();
  return {
    width: Math.round(rect.width / scale) || scene.offsetWidth || 1920,
    height: Math.round(rect.height / scale) || scene.offsetHeight || 1080,
  };
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Could not read blob.'));
  reader.readAsDataURL(blob);
});

const mediaSrcToDataUrl = async (currentSrc) => {
  if (!currentSrc || currentSrc.startsWith('data:')) return currentSrc;
  const response = await fetch(currentSrc, { mode: currentSrc.startsWith('blob:') ? 'same-origin' : 'cors', cache: 'force-cache' });
  if (!response.ok) return '';
  return blobToDataUrl(await response.blob());
};

const waitForSceneMedia = async (scene) => {
  const images = Array.from(scene.querySelectorAll('img'));
  const videos = Array.from(scene.querySelectorAll('video'));
  await Promise.allSettled([
    ...images.map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();
      if (typeof image.decode === 'function') return image.decode().catch(() => undefined);
      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 2500);
      });
    }),
    ...videos.map((video) => {
      if (video.readyState >= 2) return Promise.resolve();
      video.load?.();
      return new Promise((resolve) => {
        video.addEventListener('loadeddata', resolve, { once: true });
        video.addEventListener('canplay', resolve, { once: true });
        video.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 3500);
      });
    }),
  ]);
};

const getElementMediaSrc = (element) => element?.currentSrc || element?.src || element?.getAttribute?.('src') || '';

const extractGoogleDriveFileId = (value = '') => {
  const input = String(value || '').trim();
  if (!input) return '';

  for (const pattern of GOOGLE_DRIVE_FILE_ID_PATTERNS) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }

  return '';
};

const getLocalRendererMediaUrl = (value = '') => {
  const currentSrc = String(value || '').trim();
  if (!currentSrc || currentSrc.startsWith('data:') || currentSrc.startsWith('blob:')) return currentSrc;
  const fileId = extractGoogleDriveFileId(currentSrc);
  if (!fileId) return currentSrc;
  return `${LOCAL_RENDERER_BASE_URL}/drive-media/${encodeURIComponent(fileId)}`;
};

const getClonedElementByExportId = (clone, exportId) => clone.querySelector(`[${PROMO_MEDIA_EXPORT_ID}="${exportId}"]`);

const markPromoMediaForExport = (scene) => {
  const markedElements = Array.from(scene.querySelectorAll([
    PROMO_DISH_IMAGE_SELECTOR,
    PROMO_BACKGROUND_MEDIA_SELECTOR,
    PROMO_GIF_OVERLAY_SELECTOR,
  ].join(',')));

  markedElements.forEach((element, index) => {
    element.setAttribute(PROMO_MEDIA_EXPORT_ID, `promo-media-${index}`);
  });
};

const cleanupPromoMediaExportMarks = (scene, clone) => {
  scene.querySelectorAll(`[${PROMO_MEDIA_EXPORT_ID}]`).forEach((element) => element.removeAttribute(PROMO_MEDIA_EXPORT_ID));
  clone.querySelectorAll(`[${PROMO_MEDIA_EXPORT_ID}]`).forEach((element) => element.removeAttribute(PROMO_MEDIA_EXPORT_ID));
};

const copyElementPresentation = (source, target) => {
  target.className = source.className;
  target.style.cssText = source.style.cssText;
  Array.from(source.attributes || []).forEach((attribute) => {
    if (['src', 'srcset', 'alt', 'loading', 'decoding', 'crossorigin'].includes(attribute.name)) return;
    target.setAttribute(attribute.name, attribute.value);
  });
};

const makeVideoOverlayFromImage = (sourceImage, videoDataUrl) => {
  const video = document.createElement('video');
  copyElementPresentation(sourceImage, video);
  video.src = videoDataUrl;
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
  video.setAttribute('data-promo-video-overlay', 'true');
  return video;
};

const convertGifOverlayToVideoDataUrl = async (sourceImage) => {
  const currentSrc = getLocalRendererMediaUrl(getElementMediaSrc(sourceImage));
  if (!currentSrc) return '';

  let payload = null;
  if (/^https?:\/\//i.test(currentSrc) && GIF_URL_PATTERN.test(currentSrc)) {
    payload = { url: currentSrc };
  } else if (currentSrc.startsWith('data:image/gif')) {
    payload = { dataUrl: currentSrc };
  } else if (currentSrc.startsWith('blob:')) {
    const dataUrl = await mediaSrcToDataUrl(currentSrc);
    if (dataUrl?.startsWith('data:image/gif')) payload = { dataUrl };
  } else {
    const dataUrl = await mediaSrcToDataUrl(currentSrc);
    if (dataUrl?.startsWith('data:image/gif')) payload = { dataUrl };
  }

  if (!payload) return '';

  const response = await fetch(`${LOCAL_RENDERER_BASE_URL}/convert-gif`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return '';

  const webmBlob = await response.blob();
  if (!webmBlob.size) return '';
  return blobToDataUrl(webmBlob);
};

const replaceGifImagesWithVideosInClone = async (scene, clone) => {
  const sourceGifs = Array.from(scene.querySelectorAll(GIF_EXPORT_IMAGE_SELECTOR));
  if (!sourceGifs.length) return;

  await Promise.all(sourceGifs.map(async (sourceImage) => {
    const exportId = sourceImage.getAttribute(PROMO_MEDIA_EXPORT_ID);
    const clonedImage = exportId ? getClonedElementByExportId(clone, exportId) : null;
    if (!clonedImage) return;
    try {
      const videoDataUrl = await convertGifOverlayToVideoDataUrl(sourceImage);
      if (!videoDataUrl?.startsWith('data:video')) return;
      clonedImage.replaceWith(makeVideoOverlayFromImage(clonedImage, videoDataUrl));
    } catch (error) {
      console.warn('Could not convert GIF image for HTML export:', error instanceof Error ? error.message : String(error));
    }
  }));
};

const imageElementToDataUrl = async (sourceImage, preferredSrc = '') => {
  const currentSrc = preferredSrc || getElementMediaSrc(sourceImage);
  if (!currentSrc || currentSrc.startsWith('data:')) return currentSrc;

  const fetchedDataUrl = await mediaSrcToDataUrl(currentSrc).catch(() => '');
  if (fetchedDataUrl?.startsWith('data:image')) return fetchedDataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.naturalWidth || sourceImage.width || sourceImage.clientWidth;
  canvas.height = sourceImage.naturalHeight || sourceImage.height || sourceImage.clientHeight;
  if (!canvas.width || !canvas.height) return '';
  const context = canvas.getContext('2d');
  context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
};

const resetClonedImageAttributes = (clonedImage) => {
  clonedImage.removeAttribute('srcset');
  clonedImage.removeAttribute('crossorigin');
  clonedImage.removeAttribute('loading');
  clonedImage.removeAttribute('decoding');
};

const embedImagesInClone = async (scene, clone) => {
  const sourceImages = Array.from(scene.querySelectorAll('img'));

  await Promise.all(sourceImages.map(async (sourceImage) => {
    const exportId = sourceImage.getAttribute(PROMO_MEDIA_EXPORT_ID);
    const clonedImage = exportId ? getClonedElementByExportId(clone, exportId) : null;
    if (!clonedImage) return;
    resetClonedImageAttributes(clonedImage);

    const currentSrc = getElementMediaSrc(sourceImage);
    const rendererSrc = getLocalRendererMediaUrl(currentSrc);
    if (rendererSrc && !rendererSrc.startsWith('blob:')) clonedImage.setAttribute('src', rendererSrc);

    try {
      const dataUrl = await imageElementToDataUrl(sourceImage, rendererSrc);
      if (dataUrl?.startsWith('data:image')) clonedImage.setAttribute('src', dataUrl);
    } catch (error) {
      console.warn('Could not embed promo image in HTML export:', error instanceof Error ? error.message : String(error));
    }
  }));
};

const configureClonedVideoForExport = (clonedVideo) => {
  clonedVideo.removeAttribute('srcset');
  clonedVideo.removeAttribute('crossorigin');
  clonedVideo.removeAttribute('preload');
  clonedVideo.muted = true;
  clonedVideo.loop = true;
  clonedVideo.autoplay = true;
  clonedVideo.playsInline = true;
  clonedVideo.setAttribute('muted', 'true');
  clonedVideo.setAttribute('loop', 'true');
  clonedVideo.setAttribute('autoplay', 'true');
  clonedVideo.setAttribute('playsinline', 'true');
  clonedVideo.setAttribute('preload', 'auto');
  clonedVideo.setAttribute('aria-hidden', 'true');
  clonedVideo.setAttribute('data-promo-video-overlay', 'true');
};

const embedVideosInClone = async (scene, clone) => {
  const sourceVideos = Array.from(scene.querySelectorAll('video'));

  await Promise.all(sourceVideos.map(async (sourceVideo) => {
    const exportId = sourceVideo.getAttribute(PROMO_MEDIA_EXPORT_ID);
    const clonedVideo = exportId ? getClonedElementByExportId(clone, exportId) : null;
    if (!clonedVideo) return;

    configureClonedVideoForExport(clonedVideo);

    const currentSrc = getLocalRendererMediaUrl(getElementMediaSrc(sourceVideo));
    if (!currentSrc) return;

    clonedVideo.setAttribute('src', currentSrc);
    if (sourceVideo.matches(PROMO_BACKGROUND_MEDIA_SELECTOR)) return;

    if (currentSrc.startsWith('blob:')) {
      try {
        const dataUrl = await mediaSrcToDataUrl(currentSrc);
        if (dataUrl?.startsWith('data:')) clonedVideo.setAttribute('src', dataUrl);
      } catch (error) {
        console.warn('Could not embed blob promo video in HTML export:', error instanceof Error ? error.message : String(error));
      }
    }
  }));
};

const embedMediaInClone = async (scene, clone) => {
  await replaceGifImagesWithVideosInClone(scene, clone);
  await embedImagesInClone(scene, clone);
  await embedVideosInClone(scene, clone);
};

const getRenderReadyScript = () => `<script>
window.__PROMO_RENDER_READY__ = false;
(async function () {
  const images = Array.from(document.images || []);
  const videos = Array.from(document.querySelectorAll('video'));
  await Promise.allSettled(images.map(function (image) {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    if (typeof image.decode === 'function') return image.decode().catch(function () {});
    return new Promise(function (resolve) {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 2500);
    });
  }));
  await Promise.allSettled(videos.map(function (video) {
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    try { video.load(); } catch (error) {}
    var playPromise = video.play && video.play();
    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(function () {});
    if (video.readyState >= 2) return Promise.resolve();
    return new Promise(function (resolve) {
      video.addEventListener('loadeddata', resolve, { once: true });
      video.addEventListener('canplay', resolve, { once: true });
      video.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 3500);
    });
  }));
  window.__PROMO_RENDER_READY__ = true;
})();
<\/script>`;

export const getSceneHtmlDocument = async () => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  await waitForSceneMedia(scene);
  markPromoMediaForExport(scene);
  const clone = scene.cloneNode(true);
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';

  await embedMediaInClone(scene, clone);
  cleanupPromoMediaExportMarks(scene, clone);

  const { width, height } = getSceneSize(scene);

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
  <body>${clone.outerHTML}${getRenderReadyScript()}</body>
</html>`;
};

const getOutputFilename = (extension) => `${getSafeFilename(getCurrentPromoTitle())}-${getSafeFilename(getPromoFormatLabel())}.${extension}`;

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

const downloadCurrentPromoPng = async (downloadGroup) => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const { width, height } = getSceneSize(scene);
  setDownloadStatus(downloadGroup, 'Creating PNG in browser...');
  const canvas = await withUnscaledScene((unscaledScene) => html2canvas(unscaledScene, {
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
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Browser could not create PNG.');
  downloadBlob(blob, getOutputFilename('png'));
  setDownloadStatus(downloadGroup, 'PNG downloaded.');
};

const downloadCurrentPromoHtml = async () => {
  const html = await getSceneHtmlDocument();
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${getSafeFilename(getCurrentPromoTitle())}.html`);
};

const downloadCurrentPromoVideo = async (downloadGroup, output) => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const duration = getSelectedDuration();
  const html = await getSceneHtmlDocument();
  const { width, height } = getSceneSize(scene);
  const extension = output === 'webm' ? 'webm' : 'mp4';
  const filename = `${getSafeFilename(getCurrentPromoTitle())}-${getSafeFilename(getPromoFormatLabel())}-${duration}s.${extension}`;

  await downloadHtmlRender({
    output: extension,
    filename,
    format: { width, height, label: getPromoFormatLabel() },
    duration,
    fps: 24,
    html,
    onStatus: (message) => setDownloadStatus(downloadGroup, message),
  });
  setDownloadStatus(downloadGroup, `${extension.toUpperCase()} downloaded.`);
};

const findDownloadGroup = () => Array.from(document.querySelectorAll('.promo-panel-group'))
  .find((group) => group.querySelector('h3')?.textContent?.trim() === 'Download');

const installDownloadButtons = () => {
  const downloadGroup = findDownloadGroup();
  if (!downloadGroup || downloadGroup.dataset.promoDownloadEnhanced === 'true') return;
  const buttons = Array.from(downloadGroup.querySelectorAll('button'));
  const pngButton = buttons.find((button) => button.textContent?.trim().toUpperCase() === 'PNG');
  const mp4Button = buttons.find((button) => button.textContent?.trim().toUpperCase() === 'MP4');
  const webmButton = buttons.find((button) => button.textContent?.trim().toUpperCase() === 'WEBM');

  if (pngButton) pngButton.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      await downloadCurrentPromoPng(downloadGroup);
    } catch (error) {
      console.error(error);
      setDownloadStatus(downloadGroup, error instanceof Error ? error.message : 'PNG export failed.');
    }
  }, true);

  if (mp4Button) mp4Button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      setDownloadStatus(downloadGroup, 'Preparing MP4 render...');
      await downloadCurrentPromoVideo(downloadGroup, 'mp4');
    } catch (error) {
      console.error(error);
      setDownloadStatus(downloadGroup, error instanceof Error ? error.message : 'MP4 export failed.');
    }
  }, true);

  if (webmButton) webmButton.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      setDownloadStatus(downloadGroup, 'Preparing WEBM render...');
      await downloadCurrentPromoVideo(downloadGroup, 'webm');
    } catch (error) {
      console.error(error);
      setDownloadStatus(downloadGroup, error instanceof Error ? error.message : 'WEBM export failed.');
    }
  }, true);

  downloadGroup.dataset.promoDownloadEnhanced = 'true';
};

export const installPromoHtmlDownloadButton = installDownloadButtons;

if (typeof window !== 'undefined') {
  window.promoHtmlDownload = {
    getSceneHtmlDocument,
    downloadCurrentPromoHtml,
    downloadCurrentPromoVideo,
    downloadCurrentPromoPng,
  };
  window.addEventListener('load', installDownloadButtons);
  const observer = new MutationObserver(() => window.requestAnimationFrame(installDownloadButtons));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.requestAnimationFrame(installDownloadButtons);
}
