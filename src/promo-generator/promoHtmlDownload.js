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

const getSceneHtmlDocument = () => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const clone = scene.cloneNode(true);
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';

  const width = Math.round(scene.getBoundingClientRect().width / (scene.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1)) || scene.offsetWidth || 1920;
  const height = Math.round(scene.getBoundingClientRect().height / (scene.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1)) || scene.offsetHeight || 1080;

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

const downloadCurrentPromoHtml = () => {
  const title = document.querySelector('.promo-generator-toolbar h2')?.textContent || 'tv-promo';
  const html = getSceneHtmlDocument();
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${getSafeFilename(title)}.html`);
};

const ensureHtmlButton = () => {
  const downloadGroup = Array.from(document.querySelectorAll('.promo-panel-group'))
    .find((group) => group.querySelector('h3')?.textContent?.trim() === 'Download');
  const buttonRow = downloadGroup?.querySelector('.promo-duration-buttons');
  if (!buttonRow || buttonRow.querySelector('[data-promo-html-download]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'HTML';
  button.dataset.promoHtmlDownload = 'true';
  button.addEventListener('click', () => {
    try {
      downloadCurrentPromoHtml();
    } catch (error) {
      console.error(error);
      const status = downloadGroup.querySelector('.promo-preview-size');
      if (status) status.textContent = error instanceof Error ? error.message : 'HTML export failed.';
    }
  });

  buttonRow.appendChild(button);
};

export const installPromoHtmlDownloadButton = () => {
  if (typeof window === 'undefined') return;

  const observer = new MutationObserver(ensureHtmlButton);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', ensureHtmlButton);
  ensureHtmlButton();
};
