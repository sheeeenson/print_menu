const PROGRESS_BAR_SELECTOR = '[data-promo-render-progress]';

const injectStyles = () => {
  if (document.getElementById('promo-render-progress-styles')) return;
  const style = document.createElement('style');
  style.id = 'promo-render-progress-styles';
  style.textContent = `
    .promo-render-progress {
      display: none;
      gap: 8px;
      margin-top: 10px;
      padding: 10px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.07);
    }

    .promo-render-progress.is-visible {
      display: grid;
    }

    .promo-render-progress__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: rgba(255, 255, 255, 0.92);
      font-size: 12px;
      font-weight: 800;
      line-height: 1.25;
    }

    .promo-render-progress__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .promo-render-progress__percent {
      flex: 0 0 auto;
      font-variant-numeric: tabular-nums;
    }

    .promo-render-progress__track {
      position: relative;
      width: 100%;
      height: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.16);
    }

    .promo-render-progress__fill {
      width: 0%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #f97316, #facc15);
      transition: width 220ms ease;
    }

    .promo-render-progress__track.is-indeterminate .promo-render-progress__fill {
      width: 38%;
      animation: promo-progress-slide 1.1s ease-in-out infinite;
    }

    @keyframes promo-progress-slide {
      0% { transform: translateX(-110%); }
      100% { transform: translateX(285%); }
    }
  `;
  document.head.appendChild(style);
};

const getDownloadGroup = () => Array.from(document.querySelectorAll('.promo-panel-group'))
  .find((group) => group.querySelector('h3')?.textContent?.trim() === 'Download');

const ensureProgressBar = (downloadGroup) => {
  let progress = downloadGroup.querySelector(PROGRESS_BAR_SELECTOR);
  if (progress) return progress;

  progress = document.createElement('div');
  progress.className = 'promo-render-progress';
  progress.setAttribute('data-promo-render-progress', 'true');
  progress.innerHTML = `
    <div class="promo-render-progress__top">
      <span class="promo-render-progress__label">Preparing render...</span>
      <span class="promo-render-progress__percent">0%</span>
    </div>
    <div class="promo-render-progress__track">
      <div class="promo-render-progress__fill"></div>
    </div>
  `;

  const status = downloadGroup.querySelector('.promo-preview-size');
  if (status?.nextSibling) downloadGroup.insertBefore(progress, status.nextSibling);
  else downloadGroup.appendChild(progress);
  return progress;
};

const parsePercent = (message) => {
  const match = String(message || '').match(/(\d{1,3})%/);
  if (!match) return null;
  return Math.min(100, Math.max(0, Number(match[1])));
};

const isRenderMessage = (message) => /render|rendering|queued|creating|checking local|mp4|webm|frames|encoding/i.test(String(message || ''));
const isDoneMessage = (message) => /downloaded|done|finishing/i.test(String(message || ''));
const isErrorMessage = (message) => /failed|error|timed out|unable|not found/i.test(String(message || ''));

const updateProgressBar = () => {
  injectStyles();
  const downloadGroup = getDownloadGroup();
  if (!downloadGroup) return;

  const status = downloadGroup.querySelector('.promo-preview-size');
  const message = status?.textContent?.trim() || '';
  const progress = ensureProgressBar(downloadGroup);
  const label = progress.querySelector('.promo-render-progress__label');
  const percentLabel = progress.querySelector('.promo-render-progress__percent');
  const track = progress.querySelector('.promo-render-progress__track');
  const fill = progress.querySelector('.promo-render-progress__fill');

  if (!message || (!isRenderMessage(message) && !isDoneMessage(message) && !isErrorMessage(message))) {
    progress.classList.remove('is-visible');
    return;
  }

  progress.classList.add('is-visible');
  if (label) label.textContent = message;

  const parsedPercent = parsePercent(message);
  const percent = isDoneMessage(message) ? 100 : parsedPercent;

  if (percent === null) {
    track?.classList.add('is-indeterminate');
    if (percentLabel) percentLabel.textContent = '...';
    if (fill) fill.style.width = '';
    return;
  }

  track?.classList.remove('is-indeterminate');
  if (percentLabel) percentLabel.textContent = `${percent}%`;
  if (fill) fill.style.width = `${percent}%`;

  if (isErrorMessage(message)) {
    track?.classList.remove('is-indeterminate');
    if (percentLabel) percentLabel.textContent = 'Error';
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('load', updateProgressBar);
  const observer = new MutationObserver(() => window.requestAnimationFrame(updateProgressBar));
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.requestAnimationFrame(updateProgressBar);
  window.setTimeout(updateProgressBar, 300);
}
