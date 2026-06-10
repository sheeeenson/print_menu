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

const skipGifSubBlocks = (bytes, position) => {
  let cursor = position;
  while (cursor < bytes.length) {
    const size = bytes[cursor];
    cursor += 1;
    if (!size) break;
    cursor += size;
  }
  return cursor;
};

const estimateGifDurationSeconds = async (gifUrl) => {
  try {
    const response = await fetch(gifUrl, { mode: 'cors', cache: 'force-cache' });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 13) return null;

    const signature = String.fromCharCode(...bytes.slice(0, 6));
    if (signature !== 'GIF87a' && signature !== 'GIF89a') return null;

    let cursor = 13;
    const globalColorTable = (bytes[10] & 0x80) !== 0;
    if (globalColorTable) cursor += 3 * (2 ** ((bytes[10] & 0x07) + 1));

    let pendingDelay = 10;
    let totalDelay = 0;
    let frames = 0;

    while (cursor < bytes.length) {
      const block = bytes[cursor];
      if (block === 0x3b) break;

      if (block === 0x21) {
        const label = bytes[cursor + 1];
        if (label === 0xf9 && bytes[cursor + 2] === 0x04) {
          const delay = bytes[cursor + 4] | (bytes[cursor + 5] << 8);
          pendingDelay = delay > 0 ? delay : 10;
          cursor += 8;
        } else {
          cursor = skipGifSubBlocks(bytes, cursor + 2);
        }
        continue;
      }

      if (block === 0x2c) {
        frames += 1;
        totalDelay += pendingDelay > 0 ? pendingDelay : 10;
        pendingDelay = 10;
        const packed = bytes[cursor + 9] || 0;
        cursor += 10;
        if (packed & 0x80) cursor += 3 * (2 ** ((packed & 0x07) + 1));
        cursor += 1;
        cursor = skipGifSubBlocks(bytes, cursor);
        continue;
      }

      cursor += 1;
    }

    if (!frames || !totalDelay) return null;
    return totalDelay / 100;
  } catch (error) {
    return null;
  }
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
    status.textContent = 'Reading GIF timing...';
    const detectedDuration = await estimateGifDurationSeconds(gifUrl);

    status.textContent = 'Converting GIF to sprite sheet...';
    const response = await fetch(`${LOCAL_RENDERER_BASE_URL}/convert-gif-sprite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: gifUrl }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || payload?.error || 'GIF sprite conversion failed.');
    if (!payload?.spriteDataUrl || !payload.frames || !payload.fps) throw new Error('Sprite converter returned incomplete data.');

    const fallbackDuration = Number(payload.frames) / Math.max(1, Number(payload.fps) || 12);
    const durationSeconds = Number(payload.durationSeconds) || detectedDuration || fallbackDuration;

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      sourceUrl: gifUrl,
      spriteDataUrl: payload.spriteDataUrl,
      frames: payload.frames,
      fps: payload.fps,
      durationSeconds,
      truncated: Boolean(payload.truncated),
      createdAt: Date.now(),
    }));

    processSpriteOverlay();
    const timingText = `${payload.frames} frames, ${durationSeconds.toFixed(2)}s`;
    status.textContent = payload.truncated
      ? `Converted to sprite: ${timingText}. Long GIF was truncated.`
      : `Converted to sprite: ${timingText}.`;
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
