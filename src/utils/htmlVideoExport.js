export const getSafeRenderFilename = (value, fallback = 'html-video') => String(value || fallback)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || fallback;

const downloadUrl = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const getRenderErrorMessage = async (response, fallbackMessage) => {
  const responseText = await response.text();
  if (!responseText) return fallbackMessage;

  try {
    const payload = JSON.parse(responseText);
    return payload.detail || payload.error || responseText;
  } catch (error) {
    return responseText;
  }
};

export async function downloadHtmlRender({
  endpoint = '/api/promo-render',
  output = 'mp4',
  filename,
  format,
  duration = 8,
  fps = 24,
  html,
  settings,
  dish,
}) {
  const extension = output === 'png' ? 'png' : 'mp4';
  const fallbackMessage = `${extension.toUpperCase()} export failed.`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      output,
      filename,
      format,
      duration,
      fps,
      settings,
      dish,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(await getRenderErrorMessage(response, fallbackMessage));
  }

  const fileBlob = await response.blob();
  if (!fileBlob.size) throw new Error(`Renderer returned an empty ${extension.toUpperCase()} file.`);

  const fileUrl = URL.createObjectURL(fileBlob);
  downloadUrl(fileUrl, filename);
  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
}
