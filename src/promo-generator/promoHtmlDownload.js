import html2canvas from 'html2canvas';
import { downloadHtmlRender } from '../utils/htmlVideoExport.js';

const LOCAL_RENDERER_DOWNLOAD_FOLDER_URL = 'https://drive.google.com/drive/folders/1mFt6XpH5MhlYH48TlJ37y9O1VtGU4e3D?usp=sharing';
const LOCAL_RENDERER_MAC_URL = 'https://drive.google.com/uc?export=download&id=19yrHrnwx2JziRZHJTBN_PJ8MiJxbaspC';
const LOCAL_RENDERER_WINDOWS_URL = 'https://drive.google.com/uc?export=download&id=1SkuHoZssolnEIva_7oJpiGbrQ9SQ14_Q';
const PROJECT_STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:v1';
const DURATION_STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:export-duration:v1';
const ALLOWED_DURATIONS = [8, 16, 32];

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

const readProject = () => {
  try {
    return JSON.parse(window.localStorage.getItem(PROJECT_STORAGE_KEY) || '{}');
  } catch (error) {
    return {};
  }
};

const getSelectedDuration = () => {
  const button = Array.from(document.querySelectorAll('.promo-panel-group'))
    .find((group) => group.querySelector('h3')?.textContent?.trim() === 'Duration')
    ?.querySelector('.promo-duration-buttons button.active');
  const buttonValue = Number(button?.textContent?.replace(/[^0-9]/g, ''));
  if (ALLOWED_DURATIONS.includes(buttonValue)) return buttonValue;

  const storedValue = Number(window.localStorage.getItem(DURATION_STORAGE_KEY));
  if (ALLOWED_DURATIONS.includes(storedValue)) return storedValue;

  const project = readProject();
  const projectDuration = Number(project.duration ?? project.formats?.[project.formatId]?.duration);
  if (ALLOWED_DURATIONS.includes(projectDuration)) return projectDuration;

  return 8;
};

const patchHtmlDuration = (html, duration) => {
  const durationCss = `${duration}s`;
  let nextHtml = String(html || '');
  nextHtml = nextHtml.replace(/--promo-duration:\s*[^;"']+/g, `--promo-duration: ${durationCss}`);
  const forceStyle = `<style id="promo-export-duration-fix">.promo-scene{--promo-duration:${durationCss}!important}.promo-scene,.promo-scene *{animation-duration:${durationCss}!important}</style>`;
  if (nextHtml.includes('</style>')) return nextHtml.replace('</style>', `${forceStyle}</style>`);
  return `${forceStyle}${nextHtml}`;
};

const patchFilenameDuration = (filename, duration) => {
  const extension = String(filename || '').match(/\.[^.]+$/)?.[0] || '.mp4';
  const base = String(filename || 'tv-promo.mp4').replace(/\.[^.]+$/, '').replace(/-(8|16|32)s$/, '');
  return `${base}-${duration}s${extension}`;
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

const getSceneHtmlDocument = async (duration = getSelectedDuration()) => {
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

  const html = `<!doctype html>
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

  return patchHtmlDuration(html, duration);
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
  const html = await getSceneHtmlDocument(duration);
  const { width, height } = getSceneSize(scene);
  const filename = patchFilenameDuration(getOutputFilename(output), duration);

  await downloadHtmlRender({
    output,
    filename,
    format: { id: 'current', label: `${width}x${height}`, width, height },
    duration,
    fps: 24,
    html,
    settings: { duration },
    onStatus: (message) => setDownloadStatus(downloadGroup, message),
  });

  setDownloadStatus(downloadGroup, `${output.toUpperCase()} downloaded.`);
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

const hideBuiltInButton = (buttonRow, label, dataAttribute) => {
  const builtInButton = Array.from(buttonRow.querySelectorAll('button'))
    .find((button) => button.textContent?.trim() === label && button.getAttribute(dataAttribute) !== 'true');
  if (builtInButton) builtInButton.style.display = 'none';
};

const getRendererPlatform = () => {
  const platform = navigator.platform?.toLowerCase() || '';
  const userAgent = navigator.userAgent?.toLowerCase() || '';
  if (platform.includes('win') || userAgent.includes('windows')) return 'windows';
  if (platform.includes('mac') || userAgent.includes('mac os')) return 'mac';
  return 'unknown';
};

const createRendererLink = ({ label, href }) => {
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = label;
  link.className = 'promo-local-renderer-link';
  return link;
};

const ensureLocalRendererInstallPanel = (downloadGroup) => {
  if (downloadGroup.querySelector('[data-promo-local-renderer-panel]')) return;

  const panel = document.createElement('div');
  panel.setAttribute('data-promo-local-renderer-panel', 'true');
  panel.style.marginTop = '12px';
  panel.style.padding = '12px';
  panel.style.border = '1px solid rgba(255,255,255,0.14)';
  panel.style.borderRadius = '14px';
  panel.style.background = 'rgba(255,255,255,0.06)';
  panel.style.display = 'grid';
  panel.style.gap = '8px';

  const title = document.createElement('div');
  title.textContent = 'Local Renderer for MP4/WebM';
  title.style.fontWeight = '800';
  title.style.fontSize = '13px';

  const description = document.createElement('div');
  description.textContent = 'For reliable CSS video export, run the local renderer on Mac or Windows. PNG and HTML work without it.';
  description.style.fontSize = '12px';
  description.style.opacity = '0.72';
  description.style.lineHeight = '1.35';

  const instructions = document.createElement('ol');
  instructions.style.margin = '0';
  instructions.style.paddingLeft = '18px';
  instructions.style.fontSize = '12px';
  instructions.style.opacity = '0.82';
  instructions.style.lineHeight = '1.45';

  [
    'Download renderer for your system.',
    'Unzip the file.',
    'Run the renderer app.',
    'Return here and click MP4 or WebM.',
  ].forEach((step) => {
    const item = document.createElement('li');
    item.textContent = step;
    instructions.appendChild(item);
  });

  const linkRow = document.createElement('div');
  linkRow.style.display = 'flex';
  linkRow.style.flexWrap = 'wrap';
  linkRow.style.gap = '8px';

  const platform = getRendererPlatform();
  if (platform === 'mac') {
    linkRow.appendChild(createRendererLink({ label: 'Download for Mac', href: LOCAL_RENDERER_MAC_URL }));
    linkRow.appendChild(createRendererLink({ label: 'Windows', href: LOCAL_RENDERER_WINDOWS_URL }));
  } else if (platform === 'windows') {
    linkRow.appendChild(createRendererLink({ label: 'Download for Windows', href: LOCAL_RENDERER_WINDOWS_URL }));
    linkRow.appendChild(createRendererLink({ label: 'Mac', href: LOCAL_RENDERER_MAC_URL }));
  } else {
    linkRow.appendChild(createRendererLink({ label: 'Download for Mac', href: LOCAL_RENDERER_MAC_URL }));
    linkRow.appendChild(createRendererLink({ label: 'Download for Windows', href: LOCAL_RENDERER_WINDOWS_URL }));
  }
  linkRow.appendChild(createRendererLink({ label: 'Download folder', href: LOCAL_RENDERER_DOWNLOAD_FOLDER_URL }));

  panel.appendChild(title);
  panel.appendChild(description);
  panel.appendChild(instructions);
  panel.appendChild(linkRow);
  downloadGroup.appendChild(panel);
};

const ensureDownloadButtons = () => {
  const downloadGroup = Array.from(document.querySelectorAll('.promo-panel-group'))
    .find((group) => group.querySelector('h3')?.textContent?.trim() === 'Download');
  const buttonRow = downloadGroup?.querySelector('.promo-duration-buttons');
  if (!buttonRow) return;

  hideBuiltInButton(buttonRow, 'PNG', 'data-promo-browser-png-download');
  hideBuiltInButton(buttonRow, 'MP4', 'data-promo-job-mp4-download');

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
    label: 'MP4',
    dataAttribute: 'data-promo-job-mp4-download',
    onClick: async (group) => {
      setDownloadStatus(group, 'Preparing MP4 export...');
      await downloadCurrentPromoVideo(group, 'mp4');
    },
  });

  addDownloadButton({
    buttonRow,
    downloadGroup,
    label: 'WebM',
    dataAttribute: 'data-promo-webm-download',
    onClick: async (group) => {
      setDownloadStatus(group, 'Preparing WebM export...');
      await downloadCurrentPromoVideo(group, 'webm');
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

  ensureLocalRendererInstallPanel(downloadGroup);
};

export const installPromoHtmlDownloadButton = () => {
  if (typeof window === 'undefined') return;

  const observer = new MutationObserver(ensureDownloadButtons);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', ensureDownloadButtons);
  ensureDownloadButtons();
};
