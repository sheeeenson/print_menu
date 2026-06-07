const STORAGE_KEY = 'restaurant-menu-studio:tv-promo-generator:safe-area-overlay:v1';

const PLATFORMS = [
  { id: 'instagram_reels', label: 'Instagram Reels' },
  { id: 'instagram_stories', label: 'Instagram Stories' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube_shorts', label: 'YouTube Shorts' },
  { id: 'feed_4_5', label: 'Instagram Feed 4:5' },
  { id: 'square_1_1', label: 'Square Post 1:1' },
];

const DEFAULT_STATE = { enabled: false, platform: 'instagram_reels' };

const readState = () => {
  try {
    return { ...DEFAULT_STATE, ...(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')) };
  } catch (error) {
    return { ...DEFAULT_STATE };
  }
};

const writeState = (state) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_STATE, ...state }));
};

const getPlatformLabel = (platformId) => PLATFORMS.find((platform) => platform.id === platformId)?.label || 'Safe Area';

const injectStyles = () => {
  if (document.getElementById('promo-safe-area-overlay-styles')) return;
  const style = document.createElement('style');
  style.id = 'promo-safe-area-overlay-styles';
  style.textContent = `
    .promo-safe-area-controls { border-top: 1px solid #eadfce; padding-top: 16px; margin-top: 16px; display: grid; gap: 11px; }
    .promo-safe-area-controls h3 { margin: 0; color: #231f20; font-size: 0.86rem; text-transform: uppercase; letter-spacing: 0.08em; }
    .promo-safe-area-controls select { width: 100%; border: 1px solid #ded1c1; border-radius: 14px; background: #fff; color: #231f20; padding: 11px 12px; font: inherit; font-weight: 750; box-sizing: border-box; }
    .promo-safe-area-hint { color: #7c7065; font-size: 0.78rem; font-weight: 750; line-height: 1.35; }
    .promo-safe-area-overlay { position: absolute; inset: 0; z-index: 40; pointer-events: none; font-family: Inter, Arial, sans-serif; color: #fff; overflow: hidden; }
    .promo-safe-area-overlay * { box-sizing: border-box; }
    .promo-safe-area-dim { position: absolute; background: rgba(220, 38, 38, 0.23); border: 1px solid rgba(255, 255, 255, 0.25); }
    .promo-safe-area-safe { position: absolute; border: 2px dashed rgba(34, 197, 94, 0.95); background: rgba(34, 197, 94, 0.07); box-shadow: inset 0 0 0 9999px rgba(0,0,0,0); }
    .promo-safe-area-label { position: absolute; z-index: 3; padding: 5px 8px; border-radius: 999px; background: rgba(0, 0, 0, 0.58); font-size: 11px; line-height: 1; font-weight: 900; letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap; }
    .promo-safe-area-title { left: 10px; top: 10px; background: rgba(35,31,32,0.72); }
    .promo-safe-area-safe-label { left: 50%; top: 50%; transform: translate(-50%, -50%); background: rgba(22, 101, 52, 0.84); }
    .promo-safe-area-top-label { left: 50%; top: 4.5%; transform: translateX(-50%); }
    .promo-safe-area-bottom-label { left: 50%; bottom: 6%; transform: translateX(-50%); }
    .promo-safe-area-right-label { right: 3.5%; top: 45%; transform: rotate(90deg); transform-origin: center; }
    .promo-safe-area-left-label { left: 3.5%; bottom: 18%; transform: rotate(-90deg); transform-origin: center; }
    .promo-safe-area-center-line-x, .promo-safe-area-center-line-y { position: absolute; background: rgba(255,255,255,0.35); }
    .promo-safe-area-center-line-x { left: 0; right: 0; top: 50%; height: 1px; }
    .promo-safe-area-center-line-y { top: 0; bottom: 0; left: 50%; width: 1px; }

    .promo-safe-area-overlay.platform-instagram_reels .safe-zone,
    .promo-safe-area-overlay.platform-tiktok .safe-zone,
    .promo-safe-area-overlay.platform-youtube_shorts .safe-zone { left: 8%; right: 18%; top: 10%; bottom: 18%; }
    .promo-safe-area-overlay.platform-instagram_reels .top-zone,
    .promo-safe-area-overlay.platform-tiktok .top-zone,
    .promo-safe-area-overlay.platform-youtube_shorts .top-zone { left: 0; right: 0; top: 0; height: 10%; }
    .promo-safe-area-overlay.platform-instagram_reels .bottom-zone,
    .promo-safe-area-overlay.platform-tiktok .bottom-zone,
    .promo-safe-area-overlay.platform-youtube_shorts .bottom-zone { left: 0; right: 0; bottom: 0; height: 18%; }
    .promo-safe-area-overlay.platform-instagram_reels .right-zone,
    .promo-safe-area-overlay.platform-tiktok .right-zone,
    .promo-safe-area-overlay.platform-youtube_shorts .right-zone { right: 0; top: 10%; bottom: 18%; width: 18%; }
    .promo-safe-area-overlay.platform-instagram_reels .left-zone,
    .promo-safe-area-overlay.platform-tiktok .left-zone,
    .promo-safe-area-overlay.platform-youtube_shorts .left-zone { left: 0; bottom: 18%; width: 8%; height: 18%; }

    .promo-safe-area-overlay.platform-instagram_stories .safe-zone { left: 7%; right: 7%; top: 9%; bottom: 15%; }
    .promo-safe-area-overlay.platform-instagram_stories .top-zone { left: 0; right: 0; top: 0; height: 9%; }
    .promo-safe-area-overlay.platform-instagram_stories .bottom-zone { left: 0; right: 0; bottom: 0; height: 15%; }
    .promo-safe-area-overlay.platform-instagram_stories .right-zone { display: none; }
    .promo-safe-area-overlay.platform-instagram_stories .left-zone { display: none; }

    .promo-safe-area-overlay.platform-feed_4_5 .safe-zone { left: 7%; right: 7%; top: 8%; bottom: 13%; }
    .promo-safe-area-overlay.platform-feed_4_5 .top-zone { left: 0; right: 0; top: 0; height: 8%; }
    .promo-safe-area-overlay.platform-feed_4_5 .bottom-zone { left: 0; right: 0; bottom: 0; height: 13%; }
    .promo-safe-area-overlay.platform-feed_4_5 .right-zone { display: none; }
    .promo-safe-area-overlay.platform-feed_4_5 .left-zone { display: none; }

    .promo-safe-area-overlay.platform-square_1_1 .safe-zone { left: 7%; right: 7%; top: 8%; bottom: 12%; }
    .promo-safe-area-overlay.platform-square_1_1 .top-zone { left: 0; right: 0; top: 0; height: 8%; }
    .promo-safe-area-overlay.platform-square_1_1 .bottom-zone { left: 0; right: 0; bottom: 0; height: 12%; }
    .promo-safe-area-overlay.platform-square_1_1 .right-zone { display: none; }
    .promo-safe-area-overlay.platform-square_1_1 .left-zone { display: none; }
  `;
  document.head.appendChild(style);
};

const createControls = () => {
  const panel = document.querySelector('.promo-generator-panel');
  if (!panel || panel.querySelector('.promo-safe-area-controls')) return;

  const state = readState();
  const section = document.createElement('section');
  section.className = 'promo-safe-area-controls';
  section.innerHTML = `
    <h3>Safe Area Overlay</h3>
    <label class="promo-toggle-field">
      <input type="checkbox" class="promo-safe-area-enabled" ${state.enabled ? 'checked' : ''} />
      <span>Show safe area overlay</span>
    </label>
    <label class="image-menu-control">
      <span>Platform UI</span>
      <select class="promo-safe-area-platform">
        ${PLATFORMS.map((platform) => `<option value="${platform.id}" ${platform.id === state.platform ? 'selected' : ''}>${platform.label}</option>`).join('')}
      </select>
    </label>
    <small class="promo-safe-area-hint">Editor-only guide. It will not be included in PNG/MP4 export.</small>
  `;

  const formatGroup = Array.from(panel.querySelectorAll('.promo-panel-group')).find((group) => group.textContent?.includes('Format'));
  if (formatGroup?.nextSibling) panel.insertBefore(section, formatGroup.nextSibling);
  else panel.appendChild(section);

  section.querySelector('.promo-safe-area-enabled')?.addEventListener('change', (event) => {
    writeState({ ...readState(), enabled: event.target.checked });
    renderOverlays();
  });

  section.querySelector('.promo-safe-area-platform')?.addEventListener('change', (event) => {
    writeState({ ...readState(), platform: event.target.value });
    renderOverlays();
  });
};

const getOverlayMarkup = (platformId) => `
  <div class="promo-safe-area-dim top-zone"></div>
  <div class="promo-safe-area-dim bottom-zone"></div>
  <div class="promo-safe-area-dim right-zone"></div>
  <div class="promo-safe-area-dim left-zone"></div>
  <div class="promo-safe-area-safe safe-zone"></div>
  <div class="promo-safe-area-center-line-x"></div>
  <div class="promo-safe-area-center-line-y"></div>
  <span class="promo-safe-area-label promo-safe-area-title">${getPlatformLabel(platformId)}</span>
  <span class="promo-safe-area-label promo-safe-area-safe-label">Safe content area</span>
  <span class="promo-safe-area-label promo-safe-area-top-label">Top UI</span>
  <span class="promo-safe-area-label promo-safe-area-bottom-label">Caption / CTA UI</span>
  <span class="promo-safe-area-label promo-safe-area-right-label">Buttons</span>
  <span class="promo-safe-area-label promo-safe-area-left-label">Profile / text</span>
`;

const renderOverlays = () => {
  const state = readState();
  document.querySelectorAll('.promo-canvas-wrap').forEach((wrap) => {
    let overlay = wrap.querySelector('.promo-safe-area-overlay');

    if (!state.enabled) {
      overlay?.remove();
      return;
    }

    if (!overlay) {
      overlay = document.createElement('div');
      wrap.appendChild(overlay);
    }

    overlay.className = `promo-safe-area-overlay platform-${state.platform}`;
    overlay.innerHTML = getOverlayMarkup(state.platform);
  });
};

const bootSafeAreaOverlay = () => {
  injectStyles();
  createControls();
  renderOverlays();
};

if (typeof window !== 'undefined') {
  window.addEventListener('load', bootSafeAreaOverlay);
  const observer = new MutationObserver(() => window.requestAnimationFrame(bootSafeAreaOverlay));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.requestAnimationFrame(bootSafeAreaOverlay);
  window.setTimeout(bootSafeAreaOverlay, 350);
}
