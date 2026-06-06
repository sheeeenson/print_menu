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

const getSceneSize = (scene) => {
  const scale = Number(scene.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1) || 1;
  const rect = scene.getBoundingClientRect();
  return {
    width: Math.round(rect.width / scale) || scene.offsetWidth || 1920,
    height: Math.round(rect.height / scale) || scene.offsetHeight || 1080,
  };
};

const getCurrentPromoTitle = () => document.querySelector('.promo-generator-toolbar h2')?.textContent || 'tv-promo';

const getSceneHtmlDocument = () => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const clone = scene.cloneNode(true);
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';

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

const setDownloadStatus = (downloadGroup, message) => {
  const status = downloadGroup?.querySelector('.promo-preview-size');
  if (status) status.textContent = message;
};

const downloadCurrentPromoHtml = () => {
  const html = getSceneHtmlDocument();
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${getSafeFilename(getCurrentPromoTitle())}.html`);
};

const downloadCurrentPromoWebm = async (downloadGroup) => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const html = getSceneHtmlDocument();
  const { width, height } = getSceneSize(scene);
  const filename = `${getSafeFilename(getCurrentPromoTitle())}.webm`;

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

  addDownloadButton({
    buttonRow,
    downloadGroup,
    label: 'WebM',
    dataAttribute: 'data-promo-webm-download',
    onClick: downloadCurrentPromoWebm,
  });

  addDownloadButton({
    buttonRow,
    downloadGroup,
    label: 'HTML',
    dataAttribute: 'data-promo-html-download',
    onClick: () => {
      downloadCurrentPromoHtml();
      setDownloadStatus(downloadGroup, 'HTML downloaded.');
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
