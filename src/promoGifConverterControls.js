const LOCAL_RENDERER_BASE_URL = 'http://localhost:3020';
const GIF_URL_PATTERN = /\.gif(?:\?.*)?$/i;

const getGifGroup = () => Array.from(document.querySelectorAll('.promo-panel-group'))
  .find((group) => group.querySelector('h3')?.textContent?.trim() === 'GIF Overlay');

const getGifUrlInput = (group) => Array.from(group?.querySelectorAll('input') || [])
  .find((input) => input.placeholder === 'Paste GIF URL');

const setInputValue = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

const ensureStatus = (group) => {
  let status = group.querySelector('[data-promo-gif-converter-status]');
  if (status) return status;
  status = document.createElement('small');
  status.className = 'promo-preview-size';
  status.setAttribute('data-promo-gif-converter-status', 'true');
  group.appendChild(status);
  return status;
};

const convertGif = async (group) => {
  const input = getGifUrlInput(group);
  const status = ensureStatus(group);
  const gifUrl = input?.value?.trim() || '';

  if (!gifUrl) {
    status.textContent = 'Paste a GIF URL first.';
    return;
  }

  if (!GIF_URL_PATTERN.test(gifUrl)) {
    status.textContent = 'Converter expects a direct .gif URL. MP4/WebM can be used without conversion.';
    return;
  }

  try {
    status.textContent = 'Converting GIF to WebM via local renderer...';
    const response = await fetch(`${LOCAL_RENDERER_BASE_URL}/convert-gif`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: gifUrl }),
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      throw new Error(detail?.detail || detail?.error || 'GIF conversion failed.');
    }

    const blob = await response.blob();
    if (!blob.size) throw new Error('Converter returned an empty WebM file.');
    const videoUrl = URL.createObjectURL(blob);
    setInputValue(input, videoUrl);
    status.textContent = 'Converted. This overlay now uses a WebM video for steadier export speed.';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'GIF conversion failed.';
  }
};

const ensureButton = () => {
  const group = getGifGroup();
  if (!group || group.querySelector('[data-promo-gif-converter-button]')) return;

  const input = getGifUrlInput(group);
  if (!input) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Convert GIF to WebM';
  button.setAttribute('data-promo-gif-converter-button', 'true');
  button.className = 'secondary-button';
  button.style.marginTop = '8px';
  button.addEventListener('click', () => convertGif(group));

  input.closest('label')?.insertAdjacentElement('afterend', button);
};

if (typeof window !== 'undefined') {
  window.addEventListener('load', ensureButton);
  const observer = new MutationObserver(() => window.requestAnimationFrame(ensureButton));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.requestAnimationFrame(ensureButton);
}
