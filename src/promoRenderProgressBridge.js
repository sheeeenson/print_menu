const STYLE_ID = 'promo-render-progress-bridge-styles';
const BAR_ID = 'promo-render-progress-floating';

const injectStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .promo-render-progress-bridge {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 2147483000;
      display: none;
      width: min(420px, calc(100vw - 32px));
      padding: 16px;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 18px;
      background: rgba(20, 18, 16, 0.94);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255,255,255,0.12);
      backdrop-filter: blur(12px);
      color: #fffaf2;
    }
    .promo-render-progress-bridge.is-visible { display: grid; gap: 10px; }
    .promo-render-progress-bridge__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .promo-render-progress-bridge__title { color: #fffaf2; font-size: 13px; font-weight: 900; line-height: 1.25; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .promo-render-progress-bridge__percent { color: #fffaf2; font-size: 13px; font-weight: 950; font-variant-numeric: tabular-nums; }
    .promo-render-progress-bridge__track { width: 100%; height: 13px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,0.20); }
    .promo-render-progress-bridge__fill { height: 100%; width: 0%; border-radius: inherit; background: linear-gradient(90deg, #f97316, #facc15); transition: width 220ms ease; }
    .promo-render-progress-bridge__track.is-indeterminate .promo-render-progress-bridge__fill { width: 36%; animation: promo-render-progress-bridge-slide 1.1s ease-in-out infinite; }
    @keyframes promo-render-progress-bridge-slide { 0% { transform: translateX(-120%); } 100% { transform: translateX(300%); } }
    @media (max-width: 640px) {
      .promo-render-progress-bridge { left: 16px; right: 16px; bottom: 16px; width: auto; }
    }
  `;
  document.head.appendChild(style);
};

const ensureBar = () => {
  injectStyles();
  let bar = document.getElementById(BAR_ID);
  if (bar) return bar;

  bar = document.createElement('div');
  bar.id = BAR_ID;
  bar.className = 'promo-render-progress-bridge';
  bar.setAttribute('data-promo-render-progress-bridge', 'true');
  bar.innerHTML = `
    <div class="promo-render-progress-bridge__row">
      <span class="promo-render-progress-bridge__title">Preparing render...</span>
      <span class="promo-render-progress-bridge__percent">0%</span>
    </div>
    <div class="promo-render-progress-bridge__track">
      <div class="promo-render-progress-bridge__fill"></div>
    </div>
  `;
  document.body.appendChild(bar);
  return bar;
};

const updateBar = ({ status = 'queued', progress = {}, output = 'mp4' } = {}) => {
  const bar = ensureBar();
  if (!bar) return;

  const title = bar.querySelector('.promo-render-progress-bridge__title');
  const percentLabel = bar.querySelector('.promo-render-progress-bridge__percent');
  const track = bar.querySelector('.promo-render-progress-bridge__track');
  const fill = bar.querySelector('.promo-render-progress-bridge__fill');
  const percent = Number(progress?.percent);
  const currentFrame = Number(progress?.currentFrame);
  const totalFrames = Number(progress?.totalFrames);
  const extension = String(output || 'mp4').toUpperCase();

  bar.classList.add('is-visible');

  if (status === 'done') {
    title.textContent = `${extension} render complete. Preparing download...`;
    percentLabel.textContent = '100%';
    track.classList.remove('is-indeterminate');
    fill.style.width = '100%';
    window.setTimeout(() => bar.classList.remove('is-visible'), 4500);
    return;
  }

  if (status === 'failed') {
    title.textContent = `${extension} render failed.`;
    percentLabel.textContent = 'Error';
    track.classList.remove('is-indeterminate');
    fill.style.width = '100%';
    return;
  }

  if (Number.isFinite(percent) && percent > 0) {
    const frameText = Number.isFinite(currentFrame) && Number.isFinite(totalFrames) && totalFrames > 0
      ? ` (${currentFrame}/${totalFrames} frames)`
      : '';
    title.textContent = `Rendering ${extension}${frameText}`;
    percentLabel.textContent = `${percent}%`;
    track.classList.remove('is-indeterminate');
    fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    return;
  }

  title.textContent = status === 'queued' ? `Queued ${extension} render...` : `Starting ${extension} render...`;
  percentLabel.textContent = '...';
  track.classList.add('is-indeterminate');
  fill.style.width = '';
};

const getUrlString = (input) => {
  if (typeof input === 'string') return input;
  if (input?.url) return input.url;
  return '';
};

const isJobCreateUrl = (url) => typeof url === 'string' && /\/jobs\/?(?:\?.*)?$/.test(url);
const isJobStatusUrl = (url) => typeof url === 'string' && /\/jobs\/[^/]+\/?(?:\?.*)?$/.test(url) && !url.includes('/file');

const installFetchBridge = () => {
  if (window.__promoRenderProgressBridgeInstalled) return;
  window.__promoRenderProgressBridgeInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const url = getUrlString(input);

    if (!isJobCreateUrl(url) && !isJobStatusUrl(url)) return response;

    try {
      const clonedResponse = response.clone();
      const payload = await clonedResponse.json();
      if (payload?.id && ['queued', 'rendering', 'done', 'failed'].includes(payload.status)) {
        updateBar(payload);
      }
    } catch (error) {
      // Ignore non-job responses.
    }

    return response;
  };
};

if (typeof window !== 'undefined') {
  injectStyles();
  installFetchBridge();
  window.addEventListener('load', ensureBar);
  window.requestAnimationFrame(ensureBar);
}
