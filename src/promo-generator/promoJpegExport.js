import html2canvas from 'html2canvas';

const JPEG_QUALITY = 0.94;

const canvasToJpegBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) reject(new Error('Could not create JPEG file.'));
    else resolve(blob);
  }, 'image/jpeg', JPEG_QUALITY);
});

export const downloadPromoJpeg = async ({ format, onStatus }) => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  if (document.fonts?.ready) await document.fonts.ready;
  onStatus?.('Preparing JPEG...');

  const originalTransform = scene.style.transform;
  scene.style.transform = 'none';

  try {
    const canvas = await html2canvas(scene, {
      backgroundColor: '#231f20',
      width: format.width,
      height: format.height,
      windowWidth: format.width,
      windowHeight: format.height,
      scrollX: 0,
      scrollY: 0,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
    });
    const blob = await canvasToJpegBlob(canvas);
    return { blob, width: canvas.width, height: canvas.height, sizeKb: Math.round(blob.size / 1024) };
  } finally {
    scene.style.transform = originalTransform;
  }
};
