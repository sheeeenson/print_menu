const DEFAULT_RENDERER_ENDPOINT = 'https://print-menu.onrender.com/render';

export const getSafeRenderFilename = (value, fallback = 'html-video') => String(value || fallback)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || fallback;

const getRendererEndpoint = () => {
  const configuredEndpoint = import.meta.env?.VITE_PROMO_RENDERER_URL || import.meta.env?.VITE_RENDERER_URL || '';
  const endpoint = configuredEndpoint || DEFAULT_RENDERER_ENDPOINT;
  return endpoint.replace(/\/$/, '').replace(/\/render$/, '/render');
};

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

const fetchRender = async (endpoint, payload) => fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export async function downloadHtmlRender({
  endpoint,
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
  const payload = {
    output,
    filename,
    format,
    duration,
    fps,
    settings,
    dish,
    html,
  };

  const primaryEndpoint = endpoint || getRendererEndpoint();
  const fallbackEndpoint = '/api/promo-render';
  let response;

  try {
    response = await fetchRender(primaryEndpoint, payload);
  } catch (error) {
    if (primaryEndpoint === fallbackEndpoint) throw error;
    response = await fetchRender(fallbackEndpoint, payload);
  }

  if (!response.ok) {
    throw new Error(await getRenderErrorMessage(response, fallbackMessage));
  }

  const fileBlob = await response.blob();
  if (!fileBlob.size) throw new Error(`Renderer returned an empty ${extension.toUpperCase()} file.`);

  const fileUrl = URL.createObjectURL(fileBlob);
  downloadUrl(fileUrl, filename);
  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
}
