import html2canvas from 'html2canvas';
import { downloadHtmlRender } from '../utils/htmlVideoExport.js';

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

const setDownloadStatus = (downloadGroup, message) => {
  const status = downloadGroup?.querySelector('.promo-preview-size');
  if (status) status.textContent = message;
};

const getSceneSize = (scene) => {
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
      console.warn('Could not embed promo image in HTML export:', error instanceof Error ? error.message : String(error));
    }
  }));
};

const getSceneHtmlDocument = async () => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const clone = scene.cloneNode(true);
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';

  await embedImagesInClone(scene, clone);

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
  <body>${clone.outerHTML}</body>
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

const downloadCurrentPromoWebm = async (downloadGroup) => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const html = await getSceneHtmlDocument();
  const { width, height } = getSceneSize(scene);
  const filename = getOutputFilename('webm');

  await downloadHtmlRender({
    output: 'webm',
    filename,
    format: { id: 'current', label: `${width}x${height}`, width, height },
    duration: 8,
    fps: 24,
    html,
    onStatus: (message) => setDownloadStatus(downloadGroup, message),
  });

  setDownloadStatus(downloadGroup, 'WebM downloaded.');
};

const addDownloadButton = ({ buttonRow, downloadGroup, label, dataAttribute, onClick, prepend = false }) => {
  if (buttonRow.querySelector(`[${dataAttribute}]`)) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.setAttribute(dataAttribute, 'true');
  button.addEventListener('click', async () => {
    try {
      await onClick(downloadGroup);
    } catch (error) {
      console.error(error);
      setDownloadStatus(downloadGroup, error instanceof Error ? error.message : `${label} export failed.`);
    }
  });

  if (prepend) buttonRow.prepend(button);
  else buttonRow.appendChild(button);
};

const hideBuiltInServerPngButton = (buttonRow) => {
  const serverPngButton = Array.from(buttonRow.querySelectorAll('button'))
    .find((button) => button.textContent?.trim() === 'PNG' && button.getAttribute('data-promo-browser-png-download') !== 'true');
  if (serverPngButton) serverPngButton.style.display = 'none';
};

const ensureDownloadButtons = () => {
  const downloadGroup = Array.from(document.querySelectorAll('.promo-panel-group'))
    .find((group) => group.querySelector('h3')?.textContent?.trim() === 'Download');
  const buttonRow = downloadGroup?.querySelector('.promo-duration-buttons');
  if (!buttonRow) return;

  hideBuiltInServerPngButton(buttonRow);

  addDownloadButton({
    buttonRow,
    downloadGroup,
    label: 'PNG',
    dataAttribute: 'data-promo-browser-png-download',
    prepend: true,
    onClick: async (group) => {
      await downloadCurrentPromoPng(group);
    },
  });

  addDownloadButton({
    buttonRow,
    downloadGroup,
    label: 'WebM',
    dataAttribute: 'data-promo-webm-download',
    onClick: async (group) => {
      setDownloadStatus(group, 'Preparing WebM export...');
      await downloadCurrentPromoWebm(group);
    },
  });

  addDownloadButton({
    buttonRow,
    downloadGroup,
    label: 'HTML',
    dataAttribute: 'data-promo-html-download',
    onClick: async (group) => {
      setDownloadStatus(group, 'Preparing HTML with embedded images...');
      await downloadCurrentPromoHtml();
      setDownloadStatus(group, 'HTML downloaded.');
    },
  });
};

export const installPromoHtmlDownloadButton = () => {
  if (typeof window === 'undefined') return;

  const observer = new MutationObserver(ensureDownloadButtons);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', ensureDownloadButtons);
  ensureDownloadButtons();
};
