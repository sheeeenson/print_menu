const A3_PORTRAIT_WIDTH = 3508;
const A3_LANDSCAPE_WIDTH = 4961;

const getPosterScale = (scene) => {
  const width = Number.parseFloat(scene?.style?.width || '0');
  const height = Number.parseFloat(scene?.style?.height || '0');
  if (!width || !height) return 1;
  const baseWidth = width > height ? A3_LANDSCAPE_WIDTH : A3_PORTRAIT_WIDTH;
  return width / baseWidth;
};

const scaleInlineFont = (element, factor) => {
  if (!(element instanceof HTMLElement)) return;
  const current = Number.parseFloat(element.style.fontSize || '0');
  if (!current) return;
  const lastApplied = Number.parseFloat(element.dataset.posterScaledFontSize || '0');
  let base = Number.parseFloat(element.dataset.posterBaseFontSize || '0');

  if (!base || (lastApplied && Math.abs(current - lastApplied) > 0.1)) {
    base = current;
    element.dataset.posterBaseFontSize = String(base);
  }

  const scaled = Math.round(base * factor * 100) / 100;
  if (Math.abs(current - scaled) > 0.1) element.style.fontSize = `${scaled}px`;
  element.dataset.posterScaledFontSize = String(scaled);
};

const applyPosterScale = () => {
  document.querySelectorAll('.a3-poster-scene').forEach((scene) => {
    const factor = getPosterScale(scene);
    scene.dataset.posterFormatScale = String(factor);
    scene.querySelectorAll('.a3-text-element > div, .a3-offer-badge').forEach((element) => scaleInlineFont(element, factor));
  });
};

if (typeof window !== 'undefined') {
  const schedule = () => window.requestAnimationFrame(applyPosterScale);
  window.addEventListener('load', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  schedule();
}
