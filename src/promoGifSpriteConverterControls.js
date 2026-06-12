const LOCAL_RENDERER_BASE_URL = 'http://localhost:3020';
const STORAGE_KEY = 'promoGifSpriteOverlayData';
const GIF_URL_PATTERN = /\.gif(?:\?.*)?$/i;

const getGifUrlInput = (root = document) => Array.from(root.querySelectorAll('input') || [])
  .find((input) => input.placeholder === 'Paste GIF URL' || /gif/i.test(input.placeholder || ''));

const getGifGroup = () => {
  const titledGroup = Array.from(document.querySelectorAll('.promo-panel-group'))
    .find((group) => group.querySelector('h3')?.textContent?.trim() === 'GIF Overlay');
  if (titledGroup) return titledGroup;

  const input = getGifUrlInput();
  return input?.closest('.promo-panel-group') || input?.parentElement || null;
};

const ensureStatus = (group) => {
  let row = group.querySelector('[data-promo-gif-sprite-row]');
  let status = group.querySelector('[data-promo-gif-sprite-status]');

  if (!row) {
    row = document.createElement('div');
    row.setAttribute('data-promo-gif-sprite-row', 'true');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '10px';
    row.style.marginTop = '8px';
    row.style.flexWrap = 'wrap';
  }

  if (!status) {
    status = document.createElement('small');
    status.className = 'promo-preview-size';
    status.setAttribute('data-promo-gif-sprite-status', 'true');
    status.style.marginTop = '0';
    status.style.maxWidth = '100%';
    status.style.lineHeight = '1.3';
  }

  if (!status.parentElement) row.appendChild(status);
  return status;
};

const setStatus = (group, message, tone = 'neutral') => {
  const status = ensureStatus(group);
  status.textContent = message;
  status.style.color = tone === 'error' ? '#ff8a8a' : tone === 'success' ? '#9be58f' : '';
  status.title = message;
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

const convertGifToSprite = async (group) => {
  const input = getGifUrlInput(group) || getGifUrlInput();
  const gifUrl = input?.value?.trim() || '';

  if (!gifUrl) {
    setStatus(group, 'Paste a GIF URL first.', 'error');
    return;
  }

  if (!GIF_URL_PATTERN.test(gifUrl)) {
    setStatus(group, 'Use a direct .gif URL for sprite conversion.', 'error');
    return;
  }

  try {
    setStatus(group, 'Reading GIF timing...');
    const detectedDuration = await estimateGifDurationSeconds(gifUrl);

    setStatus(group, 'Converting GIF to sprite sheet...');
    const response = await fetch(`${LOCAL_RENDERER_BASE_URL}/convert-gif-sprite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: gifUrl }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = payload?.detail || payload?.error || `HTTP ${response.status}`;
      throw new Error(`GIF sprite conversion failed: ${detail}`);
    }
    if (!payload?.spriteDataUrl && !payload?.spriteUrl) throw new Error('Sprite converter returned no sprite image.');
    if (!payload.frames || !payload.fps) throw new Error('Sprite converter returned incomplete timing data.');

    const fallbackDuration = Number(payload.frames) / Math.max(1, Number(payload.fps) || 12);
    const durationSeconds = Number(payload.durationSeconds) || detectedDuration || fallbackDuration;
    const spriteData = {
      sourceUrl: gifUrl,
      spriteUrl: payload.spriteUrl || '',
      spriteDataUrl: payload.spriteDataUrl || '',
      frames: payload.frames,
      fps: payload.fps,
      durationSeconds,
      truncated: Boolean(payload.truncated),
      createdAt: Date.now(),
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(spriteData));
    } catch (storageError) {
      throw new Error('Sprite is too large for browser storage. Renderer must be updated to return spriteUrl instead of spriteDataUrl.');
    }

    const timingText = `${payload.frames} frames, ${durationSeconds.toFixed(2)}s`;
    setStatus(group, payload.truncated
      ? `Converted to sprite: ${timingText}. Long GIF was truncated.`
      : `Converted to sprite: ${timingText}.`, 'success');
  } catch (error) {
    setStatus(group, error instanceof Error ? error.message : 'GIF sprite conversion failed.', 'error');
  }
};

const ensureButton = () => {
  const group = getGifGroup();
  if (!group || group.querySelector('[data-promo-gif-sprite-button]')) return;

  const input = getGifUrlInput(group) || getGifUrlInput();
  if (!input) return;

  let row = group.querySelector('[data-promo-gif-sprite-row]');
  if (!row) {
    row = document.createElement('div');
    row.setAttribute('data-promo-gif-sprite-row', 'true');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '10px';
    row.style.marginTop = '8px';
    row.style.flexWrap = 'wrap';
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Convert GIF to Sprite';
  button.setAttribute('data-promo-gif-sprite-button', 'true');
  button.className = 'secondary-button';
  button.style.marginTop = '0';
  button.addEventListener('click', () => convertGifToSprite(group));

  const status = ensureStatus(group);
  row.prepend(button);
  if (status.parentElement !== row) row.appendChild(status);

  const oldConverter = group.querySelector('[data-promo-gif-converter-button]');
  const inputLabel = input.closest('label');
  if (oldConverter) oldConverter.insertAdjacentElement('afterend', row);
  else if (inputLabel) inputLabel.insertAdjacentElement('afterend', row);
  else input.insertAdjacentElement('afterend', row);
};

if (typeof window !== 'undefined') {
  window.addEventListener('load', ensureButton);
  const observer = new MutationObserver(() => window.requestAnimationFrame(ensureButton));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.requestAnimationFrame(ensureButton);
}
