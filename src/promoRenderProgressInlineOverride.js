const STYLE_ID = 'promo-render-progress-inline-override-styles';
const BAR_ID = 'promo-render-progress-floating';

const injectInlineStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${BAR_ID}.promo-render-progress-bridge {
      position: static !important;
      right: auto !important;
      bottom: auto !important;
      z-index: auto !important;
      width: 100% !important;
      margin: 12px 0 0 !important;
      padding: 12px !important;
      border-radius: 16px !important;
      background: rgba(255, 255, 255, 0.07) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08) !important;
      backdrop-filter: none !important;
      box-sizing: border-box !important;
    }
  `;
  document.head.appendChild(style);
};

const getDownloadGroup = () => Array.from(document.querySelectorAll('.promo-panel-group'))
  .find((group) => group.querySelector('h3')?.textContent?.trim() === 'Download');

const moveProgressIntoDownload = () => {
  injectInlineStyles();
  const bar = document.getElementById(BAR_ID);
  const group = getDownloadGroup();
  if (!bar || !group || group.contains(bar)) return;

  const installPanel = group.querySelector('[data-promo-local-renderer-panel]');
  if (installPanel) group.insertBefore(bar, installPanel);
  else group.appendChild(bar);
};

if (typeof window !== 'undefined') {
  window.addEventListener('load', moveProgressIntoDownload);
  const observer = new MutationObserver(() => window.requestAnimationFrame(moveProgressIntoDownload));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.requestAnimationFrame(moveProgressIntoDownload);
  window.setTimeout(moveProgressIntoDownload, 300);
}
