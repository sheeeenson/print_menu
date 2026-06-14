import html2canvas from 'html2canvas';

const JPEG_QUALITY = 0.94;

const getPromoSceneSize = (scene) => {
  const scale = Number(scene.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1) || 1;
  const rect = scene.getBoundingClientRect();
  return {
    width: Math.round(rect.width / scale) || scene.offsetWidth || 1920,
    height: Math.round(rect.height / scale) || scene.offsetHeight || 1080,
  };
};

const saveBlob = async (blob, filename) => {
  if (!window.showSaveFilePicker) {
    throw new Error('JPEG file save is not supported in this browser. Use Chrome or Edge.');
  }
  const handle = await window.showSaveFilePicker({ suggestedName: filename || 'tv-promo.jpg' });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
};

const canvasToJpegBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) reject(new Error('Could not create JPEG file.'));
    else resolve(blob);
  }, 'image/jpeg', JPEG_QUALITY);
});

export const downloadPromoJpeg = async ({ filename, format, onStatus }) => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const exportFormat = format?.width && format?.height ? format : getPromoSceneSize(scene);

  if (document.fonts?.ready) await document.fonts.ready;
  onStatus?.('Preparing JPEG...');

  const originalTransform = scene.style.transform;
  scene.style.transform = 'none';

  try {
    const canvas = await html2canvas(scene, {
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
    const blob = await canvasToJpegBlob(canvas);
    await saveBlob(blob, filename);
    return { width: canvas.width, height: canvas.height, sizeKb: Math.round(blob.size / 1024) };
  } finally {
    scene.style.transform = originalTransform;
  }
};
