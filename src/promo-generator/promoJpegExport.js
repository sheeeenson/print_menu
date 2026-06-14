import html2canvas from 'html2canvas';

const JPEG_QUALITY = 0.9;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const getPromoSceneSize = (scene) => {
  const scale = Number(scene.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1) || 1;
  const rect = scene.getBoundingClientRect();
  return {
    width: Math.round(rect.width / scale) || scene.offsetWidth || 1920,
    height: Math.round(rect.height / scale) || scene.offsetHeight || 1080,
  };
};

const waitForPromoMedia = async (scene) => {
  await Promise.all(Array.from(scene.querySelectorAll('img')).map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    if (typeof image.decode === 'function') return image.decode().catch(() => undefined);
    return new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    });
  }));
  await wait(120);
};

const canvasToJpegBlob = (canvas, quality = JPEG_QUALITY) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('Browser could not create JPEG.'));
      return;
    }
    resolve(blob);
  }, 'image/jpeg', quality);
});

export const downloadPromoJpeg = async ({ filename, onStatus }) => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  onStatus?.('Creating JPEG in browser...');
  await waitForPromoMedia(scene);

  const { width, height } = getPromoSceneSize(scene);
  const originalTransform = scene.style.transform;
  const originalTransformOrigin = scene.style.transformOrigin;
  const originalPosition = scene.style.position;
  const originalLeft = scene.style.left;
  const originalTop = scene.style.top;

  scene.style.transform = 'none';
  scene.style.transformOrigin = 'top left';
  scene.style.position = 'relative';
  scene.style.left = '0';
  scene.style.top = '0';

  try {
    const canvas = await html2canvas(scene, {
      backgroundColor: '#231f20',
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true,
      logging: false,
    });
    const blob = await canvasToJpegBlob(canvas);
    downloadBlob(blob, filename);
    return { width, height, sizeKb: Math.round(blob.size / 1024) };
  } finally {
    scene.style.transform = originalTransform;
    scene.style.transformOrigin = originalTransformOrigin;
    scene.style.position = originalPosition;
    scene.style.left = originalLeft;
    scene.style.top = originalTop;
  }
};
