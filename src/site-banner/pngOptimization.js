export const PNG_OPTIMIZED_TARGET_BYTES = 500 * 1024;

const canvasToPngBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('Could not create optimized PNG file.'));
      return;
    }
    resolve(blob);
  }, 'image/png', 0.94);
});

export const getQualityOptimizedPng = async (sourceCanvas) => {
  const blob = await canvasToPngBlob(sourceCanvas);
  return { blob, width: sourceCanvas.width, height: sourceCanvas.height };
};
