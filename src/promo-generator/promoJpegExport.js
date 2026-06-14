import html2canvas from 'html2canvas';

const JPEG_QUALITY = 0.94;
const LOCAL_PNG_BOUND_KEY = '__localTvPromoPngBound';

const getPromoSceneSize = (scene) => {
  const scale = Number(scene.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1) || 1;
  const rect = scene.getBoundingClientRect();
  return {
    width: Math.round(rect.width / scale) || scene.offsetWidth || 1920,
    height: Math.round(rect.height / scale) || scene.offsetHeight || 1080,
  };
};

const saveBlob = async (blob, filename, mimeType, extension) => {
  if (!window.showSaveFilePicker) {
    throw new Error('File save is not supported in this browser. Use Chrome or Edge.');
  }
  const handle = await window.showSaveFilePicker({
    suggestedName: filename || `tv-promo.${extension}`,
    types: [{ description: `${extension.toUpperCase()} image`, accept: { [mimeType]: [`.${extension}`] } }],
  });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
};

const canvasToBlob = (canvas, mimeType, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) reject(new Error(`Could not create ${mimeType} file.`));
    else resolve(blob);
  }, mimeType, quality);
});

const renderPromoCanvas = async (format, onStatus) => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const exportFormat = format?.width && format?.height ? format : getPromoSceneSize(scene);

  if (document.fonts?.ready) await document.fonts.ready;
  onStatus?.('Preparing image...');

  const originalTransform = scene.style.transform;
  const originalTransformOrigin = scene.style.transformOrigin;
  const originalPosition = scene.style.position;
  const originalLeft = scene.style.left;
  const originalTop = scene.style.top;
  const originalWidth = scene.style.width;
  const originalHeight = scene.style.height;

  scene.style.transform = 'none';
  scene.style.transformOrigin = 'top left';
  scene.style.position = 'relative';
  scene.style.left = '0';
  scene.style.top = '0';
  scene.style.width = `${exportFormat.width}px`;
  scene.style.height = `${exportFormat.height}px`;

  try {
    return await html2canvas(scene, {
      backgroundColor: '#231f20',
      width: exportFormat.width,
      height: exportFormat.height,
      windowWidth: exportFormat.width,
      windowHeight: exportFormat.height,
      scrollX: 0,
      scrollY: 0,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
    });
  } finally {
    scene.style.transform = originalTransform;
    scene.style.transformOrigin = originalTransformOrigin;
    scene.style.position = originalPosition;
    scene.style.left = originalLeft;
    scene.style.top = originalTop;
    scene.style.width = originalWidth;
    scene.style.height = originalHeight;
  }
};

const getSafeFilename = (value) => String(value || 'tv-promo').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tv-promo';

const getCurrentPromoFilename = (extension) => {
  const title = document.querySelector('.promo-generator-toolbar h2')?.textContent || 'tv-promo';
  const format = document.querySelector('.promo-output-pill')?.textContent || 'promo';
  return `${getSafeFilename(title)}-${format.replace(':', 'x')}.${extension}`;
};

const bindLocalPngButton = () => {
  if (window[LOCAL_PNG_BOUND_KEY]) return;
  window[LOCAL_PNG_BOUND_KEY] = true;
  document.addEventListener('click', async (event) => {
    const button = event.target?.closest?.('button');
    if (!button || button.textContent?.trim() !== 'PNG') return;
    if (!button.closest('.promo-generator-section')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    try {
      const canvas = await renderPromoCanvas(null, null);
      const blob = await canvasToBlob(canvas, 'image/png');
      await saveBlob(blob, getCurrentPromoFilename('png'), 'image/png', 'png');
    } catch (error) {
      console.error(error);
    }
  }, true);
};

if (typeof window !== 'undefined') bindLocalPngButton();

export const downloadPromoJpeg = async ({ filename, format, onStatus }) => {
  const canvas = await renderPromoCanvas(format, onStatus);
  const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY);
  await saveBlob(blob, filename, 'image/jpeg', 'jpg');
  return { width: canvas.width, height: canvas.height, sizeKb: Math.round(blob.size / 1024) };
};
