const VIDEO_EXTENSIONS = /\.(mp4|webm|mov)(\?.*)?$/i;

const isVideoUrl = (url = '') => VIDEO_EXTENSIONS.test(String(url).trim());

const copyAttributes = (from, to) => {
  Array.from(from.attributes || []).forEach((attribute) => {
    if (attribute.name === 'src' || attribute.name === 'alt') return;
    to.setAttribute(attribute.name, attribute.value);
  });
};

const replaceGifImageWithVideo = (image) => {
  if (!image?.src || image.dataset.promoVideoOverlayProcessed === 'true') return;
  if (!isVideoUrl(image.src)) return;

  const video = document.createElement('video');
  copyAttributes(image, video);
  video.className = image.className;
  video.src = image.src;
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('data-promo-video-overlay', 'true');
  video.style.cssText = image.style.cssText;

  image.dataset.promoVideoOverlayProcessed = 'true';
  image.replaceWith(video);
  video.play?.().catch(() => undefined);
};

const processVideoOverlays = () => {
  document.querySelectorAll('img.promo-gif-overlay[src]').forEach(replaceGifImageWithVideo);
};

if (typeof window !== 'undefined') {
  window.addEventListener('load', processVideoOverlays);
  const observer = new MutationObserver(() => window.requestAnimationFrame(processVideoOverlays));
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  window.requestAnimationFrame(processVideoOverlays);
}
