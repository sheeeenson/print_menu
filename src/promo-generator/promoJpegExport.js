import html2canvas from 'html2canvas';

const JPEG_QUALITY = 0.94;

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'tv-promo.jpg';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const canvasToJpegBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('Could not create JPEG file.'));
      return;
    }
    resolve(blob);
  }, 'image/jpeg', JPEG_QUALITY);
});

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Could not read image blob.'));
  reader.readAsDataURL(blob);
});

const imageToDataUrl = async (sourceImage) => {
  const source = sourceImage.currentSrc || sourceImage.src || sourceImage.getAttribute('src') || '';
  if (!source || source.startsWith('data:')) return source;

  if (source.startsWith('blob:')) {
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.naturalWidth || sourceImage.width;
    canvas.height = sourceImage.naturalHeight || sourceImage.height;
    if (!canvas.width || !canvas.height) return '';
    canvas.getContext('2d')?.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  const response = await fetch(source, { mode: 'cors', cache: 'force-cache' });
  if (!response.ok) return '';
  return blobToDataUrl(await response.blob());
};

const embedImagesInClone = async (scene, clone) => {
  const sourceImages = Array.from(scene.querySelectorAll('img'));
  const clonedImages = Array.from(clone.querySelectorAll('img'));

  await Promise.all(sourceImages.map(async (sourceImage, index) => {
    const clonedImage = clonedImages[index];
    if (!clonedImage) return;

    clonedImage.removeAttribute('srcset');
    clonedImage.removeAttribute('crossorigin');
    clonedImage.removeAttribute('loading');
    clonedImage.removeAttribute('decoding');

    try {
      const dataUrl = await imageToDataUrl(sourceImage);
      if (dataUrl?.startsWith('data:')) clonedImage.setAttribute('src', dataUrl);
    } catch (error) {
      console.warn('Could not embed image in promo JPEG export:', error instanceof Error ? error.message : String(error));
    }
  }));
};

const applyGeneratedBackgroundToClone = (scene, clone) => {
  const sceneStyle = window.getComputedStyle(scene);
  const sourceBackground = scene.querySelector('.promo-background');
  const clonedBackground = clone.querySelector('.promo-background');
  const sourceBackgroundStyle = sourceBackground ? window.getComputedStyle(sourceBackground) : null;

  const edgeColor = sceneStyle.getPropertyValue('--promo-edge-color')?.trim()
    || sceneStyle.backgroundColor
    || sourceBackgroundStyle?.backgroundColor
    || '#231f20';

  clone.style.setProperty('--promo-edge-color', edgeColor);
  clone.style.background = edgeColor;
  clone.style.backgroundColor = edgeColor;

  if (clonedBackground) {
    const generatedBackground = sourceBackgroundStyle?.backgroundImage && sourceBackgroundStyle.backgroundImage !== 'none'
      ? sourceBackgroundStyle.background
      : (sourceBackgroundStyle?.backgroundColor || edgeColor);
    clonedBackground.style.background = generatedBackground;
    clonedBackground.style.backgroundColor = sourceBackgroundStyle?.backgroundColor || edgeColor;
  }
};

const waitForImages = async (root) => {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(images.map((image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    if (typeof image.decode === 'function') return image.decode().catch(() => undefined);
    return new Promise((resolve) => {
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', resolve, { once: true });
    });
  }));
};

const getPromoSceneSize = (scene) => {
  const scale = Number(scene.style.transform?.match(/scale\(([^)]+)\)/)?.[1] || 1) || 1;
  const rect = scene.getBoundingClientRect();
  return {
    width: Math.round(rect.width / scale) || scene.offsetWidth || 1920,
    height: Math.round(rect.height / scale) || scene.offsetHeight || 1080,
  };
};

const createExportNode = (scene, format) => {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-100000px';
  wrapper.style.top = '0';
  wrapper.style.width = `${format.width}px`;
  wrapper.style.height = `${format.height}px`;
  wrapper.style.overflow = 'hidden';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.zIndex = '-1';

  const clone = scene.cloneNode(true);
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.position = 'relative';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.width = `${format.width}px`;
  clone.style.height = `${format.height}px`;
  clone.style.margin = '0';

  applyGeneratedBackgroundToClone(scene, clone);

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  return { wrapper, clone };
};

export const downloadPromoJpeg = async ({ filename, format, onStatus }) => {
  const scene = document.querySelector('.promo-scene');
  if (!scene) throw new Error('Could not find the promo scene.');

  const exportFormat = format?.width && format?.height ? format : getPromoSceneSize(scene);

  if (document.fonts?.ready) await document.fonts.ready;
  onStatus?.('Preparing JPEG...');

  const { wrapper, clone } = createExportNode(scene, exportFormat);

  try {
    await embedImagesInClone(scene, clone);
    await waitForImages(clone);

    const canvas = await html2canvas(clone, {
      backgroundColor: window.getComputedStyle(clone).backgroundColor || '#231f20',
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
    downloadBlob(blob, filename);

    return { width: canvas.width, height: canvas.height, sizeKb: Math.round(blob.size / 1024) };
  } finally {
    wrapper.remove();
  }
};
