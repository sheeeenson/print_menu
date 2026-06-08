const STORAGE_KEY = 'promoGifSpriteOverlayData';
const STYLE_ID = 'promo-gif-sprite-overlay-styles';

const injectStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .promo-gif-sprite-overlay {
      display: block;
      overflow: hidden;
      background-repeat: no-repeat;
      background-position: 0 0;
      background-size: var(--promo-gif-sprite-bg-width, 100%) 100%;
      animation-name: promo-gif-sprite-play;
      animation-duration: var(--promo-gif-sprite-duration, 1s);
      animation-timing-function: steps(var(--promo-gif-sprite-frames, 1));
      animation-iteration-count: infinite;
    }
    @keyframes promo-gif-sprite-play {
      from { background-position-x: 0; }
      to { background-position-x: calc(-1 * var(--promo-gif-sprite-bg-shift, 100%)); }
    }
  `;
  document.head.appendChild(style);
};

const readSpriteData = () => {
  try {
    const data = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (!data?.spriteDataUrl || !Number(data.frames) || !Number(data.fps)) return null;
    return data;
  } catch (error) {
    return null;
  }
};

const copyElementPresentation = (source, target) => {
  target.className = source.className;
  target.style.cssText = source.style.cssText;
  Array.from(source.attributes || []).forEach((attribute) => {
    if (['src', 'alt', 'class', 'style'].includes(attribute.name)) return;
    target.setAttribute(attribute.name, attribute.value);
  });
};

const replaceGifWithSprite = (image, data) => {
  if (!image || image.dataset.promoGifSpriteProcessed === 'true') return;

  const frames = Math.max(1, Number(data.frames) || 1);
  const fps = Math.max(1, Number(data.fps) || 12);
  const duration = frames / fps;
  const sprite = document.createElement('div');

  copyElementPresentation(image, sprite);
  sprite.classList.add('promo-gif-sprite-overlay');
  sprite.setAttribute('data-promo-gif-sprite-overlay', 'true');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.style.backgroundImage = `url("${data.spriteDataUrl}")`;
  sprite.style.setProperty('--promo-gif-sprite-frames', String(frames));
  sprite.style.setProperty('--promo-gif-sprite-duration', `${duration}s`);
  sprite.style.setProperty('--promo-gif-sprite-bg-width', `${frames * 100}%`);
  sprite.style.setProperty('--promo-gif-sprite-bg-shift', `${(frames - 1) * 100}%`);

  const width = image.getBoundingClientRect?.().width || image.width || Number.parseFloat(image.style.width) || 160;
  const height = image.getBoundingClientRect?.().height || image.height || Number.parseFloat(image.style.height) || 160;
  if (!sprite.style.width) sprite.style.width = `${width}px`;
  if (!sprite.style.height) sprite.style.height = `${height}px`;

  image.dataset.promoGifSpriteProcessed = 'true';
  image.replaceWith(sprite);
};

const processSpriteOverlay = () => {
  injectStyles();
  const data = readSpriteData();
  if (!data) return;
  document.querySelectorAll('img.promo-gif-overlay[src]').forEach((image) => replaceGifWithSprite(image, data));
};

if (typeof window !== 'undefined') {
  injectStyles();
  window.addEventListener('load', processSpriteOverlay);
  window.addEventListener('promo-gif-sprite-ready', processSpriteOverlay);
  const observer = new MutationObserver(() => window.requestAnimationFrame(processSpriteOverlay));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.requestAnimationFrame(processSpriteOverlay);
}
