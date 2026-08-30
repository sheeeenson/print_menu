const POSTER_FORMATS = [
  { width: 3508, height: 4961, label: 'A3 Portrait', dpi: 300 },
  { width: 4961, height: 3508, label: 'A3 Landscape', dpi: 300 },
  { width: 4961, height: 7016, label: 'A2 Portrait', dpi: 300 },
  { width: 7016, height: 4961, label: 'A2 Landscape', dpi: 300 },
  { width: 4677, height: 6622, label: 'A1 Portrait', dpi: 200 },
  { width: 6622, height: 4677, label: 'A1 Landscape', dpi: 200 },
];

const getFormatFromScene = (scene) => {
  const width = Math.round(Number.parseFloat(scene?.style?.width || '0'));
  const height = Math.round(Number.parseFloat(scene?.style?.height || '0'));
  return POSTER_FORMATS.find((format) => format.width === width && format.height === height);
};

const updatePosterUi = () => {
  const page = document.querySelector('.a3-poster-page');
  if (!page) return;

  const header = page.querySelector('.a3-poster-side-panel .app-panel-header');
  const title = header?.querySelector('h2');
  const subtitle = header?.querySelector('span');
  if (title && title.textContent !== 'Posters') title.textContent = 'Posters';
  if (subtitle) subtitle.textContent = 'Create print-ready posters in A3, A2 and A1 formats.';

  page.querySelectorAll('.app-control-group > h3').forEach((heading) => {
    if (heading.textContent?.trim() === 'Format') heading.textContent = 'Poster size';
  });

  const scene = page.querySelector('.a3-poster-scene');
  const format = getFormatFromScene(scene);
  const sizeLabel = page.querySelector('.app-preview-size');
  if (format && sizeLabel) {
    sizeLabel.textContent = `${format.label} output: ${format.width} × ${format.height}px · ${format.dpi} DPI`;
  }
};

if (typeof window !== 'undefined') {
  const schedule = () => window.requestAnimationFrame(updatePosterUi);
  window.addEventListener('load', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  schedule();
}
