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

export const getCurrentPromoSceneSize = () => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) return { width: 1920, height: 1080 };
  const scale = Number(scene.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1) || 1;
  const rect = scene.getBoundingClientRect();
  return {
    width: Math.round(rect.width / scale) || scene.offsetWidth || 1920,
    height: Math.round(rect.height / scale) || scene.offsetHeight || 1080,
  };
};

const getCurrentPromoTitle = () => document.querySelector('.promo-generator-toolbar h2')?.textContent || 'tv-promo';

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Could not read image blob.'));
  reader.readAsDataURL(blob);
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Image failed to load.'));
  image.crossOrigin = 'anonymous';
  image.src = src;
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

  try {
    const response = await fetch(currentSrc, { mode: 'cors', cache: 'force-cache' });
    if (response.ok) return blobToDataUrl(await response.blob());
  } catch (error) {
    // Fall back to canvas below.
  }

  const loadedImage = await loadImage(currentSrc);
  const canvas = document.createElement('canvas');
  canvas.width = loadedImage.naturalWidth || loadedImage.width;
  canvas.height = loadedImage.naturalHeight || loadedImage.height;
  if (!canvas.width || !canvas.height) return '';
  const context = canvas.getContext('2d');
  context.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
};

const replaceImageWithPlaceholder = (clonedImage, reason = 'Image could not be embedded') => {
  const placeholder = document.createElement('div');
  placeholder.className = clonedImage.className || 'promo-dish-placeholder';
  placeholder.setAttribute('data-image-export-error', reason);
  placeholder.style.cssText = clonedImage.getAttribute('style') || '';
  placeholder.style.display = 'grid';
  placeholder.style.placeItems = 'center';
  placeholder.style.background = 'rgba(255,255,255,0.18)';
  placeholder.style.color = 'rgba(255,250,242,0.82)';
  placeholder.style.fontSize = '42px';
  placeholder.style.fontWeight = '950';
  placeholder.style.textAlign = 'center';
  placeholder.style.padding = '32px';
  placeholder.textContent = 'Image not embedded';
  clonedImage.replaceWith(placeholder);
};

const embedImagesInClone = async (scene, clone) => {
  const sourceImages = Array.from(scene.querySelectorAll('img'));
  const clonedImages = Array.from(clone.querySelectorAll('img'));
  const failures = [];

  await Promise.all(sourceImages.map(async (sourceImage, index) => {
    const clonedImage = clonedImages[index];
    if (!clonedImage) return;

    clonedImage.removeAttribute('srcset');
    clonedImage.removeAttribute('crossorigin');
    clonedImage.removeAttribute('loading');
    clonedImage.removeAttribute('decoding');

    try {
      const dataUrl = await imageElementToDataUrl(sourceImage);
      if (!dataUrl || !dataUrl.startsWith('data:')) throw new Error('Image could not be converted to data URL.');
      clonedImage.setAttribute('src', dataUrl);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push({ index, src: sourceImage.currentSrc || sourceImage.src || '', reason });
      replaceImageWithPlaceholder(clonedImage, reason);
    }
  }));

  return failures;
};

export const getCurrentPromoHtmlDocument = async () => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const clone = scene.cloneNode(true);
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';

  const imageFailures = await embedImagesInClone(scene, clone);
  const { width, height } = getCurrentPromoSceneSize();
  const diagnostics = imageFailures.length
    ? `<!-- Image embed diagnostics: ${JSON.stringify(imageFailures).replace(/--/g, '')} -->`
    : '<!-- Image embed diagnostics: all images embedded as data URLs. -->';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${width}, initial-scale=1" />
    <title>TV Promo Export</title>
    ${diagnostics}
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
      img[src^="data:"] { -webkit-user-select: none; user-select: none; }
      ${getDocumentCss()}
    </style>
  </head>
  <body>${clone.outerHTML}</body>
</html>`;
};

const setDownloadStatus = (downloadGroup, message) => {
  const status = downloadGroup?.querySelector('.promo-preview-size');
  if (status) status.textContent = message;
};

const getPromoFormatLabel = () => document.querySelector('.promo-output-pill')?.textContent?.trim() || 'promo';

const downloadCurrentPromoHtml = async () => {
  const html = await getCurrentPromoHtmlDocument();
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${getSafeFilename(getCurrentPromoTitle())}.html`);
};

const downloadCurrentPromoRender = async (downloadGroup, output) => {
  const html = await getCurrentPromoHtmlDocument();
  const { width, height } = getCurrentPromoSceneSize();
  const extension = output === 'png' ? 'png' : output === 'webm' ? 'webm' : 'mp4';
  const filename = `${getSafeFilename(getCurrentPromoTitle())}-${getSafeFilename(getPromoFormatLabel())}.${extension}`;

  await downloadHtmlRender({
    output,
    filename,
    format: { id: 'current', label: `${width}x${height}`, width, height },
    duration: 8,
    fps: 24,
    html,
    onStatus: (message) => setDownloadStatus(downloadGroup, message),
  });

  setDownloadStatus(downloadGroup, `${extension.toUpperCase()} downloaded.`);
};

const overrideBuiltInDownloadButton = ({ button, downloadGroup, output }) => {
  if (!button || button.dataset.promoRenderOverride === 'true') return;
  button.dataset.promoRenderOverride = 'true';
  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    try {
      setDownloadStatus(downloadGroup, `Preparing ${output.toUpperCase()} export...`);
      await downloadCurrentPromoRender(downloadGroup, output);
    } catch (error) {
      console.error(error);
      setDownloadStatus(downloadGroup, error instanceof Error ? error.message : `${output.toUpperCase()} export failed.`);
    }
  }, true);
};

const addDownloadButton = ({ buttonRow, downloadGroup, label, dataAttribute, onClick }) => {
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

  buttonRow.appendChild(button);
};

const ensureDownloadButtons = () => {
  const downloadGroup = Array.from(document.querySelectorAll('.promo-panel-group'))
    .find((group) => group.querySelector('h3')?.textContent?.trim() === 'Download');
  const buttonRow = downloadGroup?.querySelector('.promo-duration-buttons');
  if (!buttonRow) return;

  const existingButtons = Array.from(buttonRow.querySelectorAll('button'));
  overrideBuiltInDownloadButton({ button: existingButtons.find((button) => button.textContent?.trim() === 'PNG'), downloadGroup, output: 'png' });
  overrideBuiltInDownloadButton({ button: existingButtons.find((button) => button.textContent?.trim() === 'MP4'), downloadGroup, output: 'mp4' });

  addDownloadButton({
    buttonRow,
    downloadGroup,
    label: 'WebM',
    dataAttribute: 'data-promo-webm-download',
    onClick: (group) => downloadCurrentPromoRender(group, 'webm'),
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
