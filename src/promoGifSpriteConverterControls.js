const LOCAL_RENDERER_BASE_URL = 'http://localhost:3020';
const STORAGE_KEY = 'promoGifSpriteOverlayData';
const GIF_URL_PATTERN = /\.gif(?:\?.*)?$/i;

const getGifGroup = () => Array.from(document.querySelectorAll('.promo-panel-group'))
  .find((group) => group.querySelector('h3')?.textContent?.trim() === 'GIF Overlay');

const getGifUrlInput = (group) => Array.from(group?.querySelectorAll('input') || [])
  .find((input) => input.placeholder === 'Paste GIF URL');

const ensureStatus = (group) => {
  let status = group.querySelector('[data-promo-gif-sprite-status]');
  if (status) return status;
  status = document.createElement('small');
  status.className = 'promo-preview-size';
  status.setAttribute('data-promo-gif-sprite-status', 'true');
  group.appendChild(status);
  return status;
};

const processSpriteOverlay = () => {
  document.querySelectorAll('img.promo-gif-overlay[src]').forEach((image) => {
    image.removeAttribute('data-promo-gif-sprite-processed');
  });
  window.dispatchEvent(new Event('promo-gif-sprite-ready'));
};

const convertGifToSprite = async (group) => {
  const input = getGifUrlInput(group);
  const status = ensureStatus(group);
  const gifUrl = input?.value?.trim() || '';

  if (!gifUrl) {
    status.textContent = 'Paste a GIF URL first.';
    return;
  }

  if (!GIF_URL_PATTERN.test(gifUrl)) {
    status.textContent = 'Use a direct .gif URL for sprite conversion.';
    return;
  }

  try {
    status.textContent = 'Converting GIF to sprite sheet...';
    const response = await fetch(`${LOCAL_RENDERER_BASE_URL}/convert-gif-sprite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: gifUrl }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || payload?.error || 'GIF sprite conversion failed.');
    if (!payload?.spriteDataUrl || !payload.frames || !payload.fps) throw new Error('Sprite converter returned incomplete data.');

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      sourceUrl: gifUrl,
      spriteDataUrl: payload.spriteDataUrl,
      frames: payload.frames,
      fps: payload.fps,
      truncated: Boolean(payload.truncated),
      createdAt: Date.now(),
    }));

    processSpriteOverlay();
    status.textContent = payload.truncated
      ? `Converted to sprite: ${payload.frames} frames at ${payload.fps}fps. Long GIF was truncated.`
      : `Converted to sprite: ${payload.frames} frames at ${payload.fps}fps.`;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'GIF sprite conversion failed.';
  }
};

const ensureButton = () => {
  const group = getGifGroup();
  if (!group || group.querySelector('[data-promo-gif-sprite-button]')) return;

  const input = getGifUrlInput(group);
  if (!input) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Convert GIF to Sprite';
  button.setAttribute('data-promo-gif-sprite-button', 'true');
  button.className = 'secondary-button';
  button.style.marginTop = '8px';
  button.addEventListener('click', () => convertGifToSprite(group));

  const oldConverter = group.querySelector('[data-promo-gif-converter-button]');
  if (oldConverter) oldConverter.insertAdjacentElement('afterend', button);
  else input.closest('label')?.insertAdjacentElement('afterend', button);
};

if (typeof window !== 'undefined') {
  window.addEventListener('load', ensureButton);
  const observer = new MutationObserver(() => window.requestAnimationFrame(ensureButton));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.requestAnimationFrame(ensureButton);
}
