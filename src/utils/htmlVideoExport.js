const DEFAULT_RENDERER_ENDPOINT = 'https://print-menu.onrender.com/render';
const JOB_POLL_INTERVAL_MS = 1200;
const JOB_TIMEOUT_MS = 300000;

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

const getRendererBaseUrl = () => getRendererEndpoint().replace(/\/render$/, '');

const getOutputExtension = (output) => {
  if (output === 'png') return 'png';
  if (output === 'webm') return 'webm';
  return 'mp4';
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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

const postJson = async (url, payload) => fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

const downloadBlobResponse = async (response, filename, extension) => {
  const fileBlob = await response.blob();
  if (!fileBlob.size) throw new Error(`Renderer returned an empty ${extension.toUpperCase()} file.`);

  const fileUrl = URL.createObjectURL(fileBlob);
  downloadUrl(fileUrl, filename);
  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
};

const downloadViaJob = async ({ baseUrl, payload, filename, extension, fallbackMessage, onStatus }) => {
  onStatus?.('Creating render job...');
  const createResponse = await postJson(`${baseUrl}/jobs`, payload);
  if (!createResponse.ok) throw new Error(await getRenderErrorMessage(createResponse, fallbackMessage));

  const job = await createResponse.json();
  const jobId = job.id;
  if (!jobId) throw new Error('Renderer did not return a job id.');

  const startedAt = Date.now();
  while (Date.now() - startedAt < JOB_TIMEOUT_MS) {
    await wait(JOB_POLL_INTERVAL_MS);
    const statusResponse = await fetch(`${baseUrl}/jobs/${jobId}`);
    if (!statusResponse.ok) throw new Error(await getRenderErrorMessage(statusResponse, fallbackMessage));

    const status = await statusResponse.json();
    onStatus?.(status.status === 'rendering' ? `Rendering ${extension.toUpperCase()}...` : `Render job ${status.status}...`);

    if (status.status === 'failed') throw new Error(status.error || fallbackMessage);
    if (status.status === 'done') {
      const fileResponse = await fetch(`${baseUrl}/jobs/${jobId}/file`);
      if (!fileResponse.ok) throw new Error(await getRenderErrorMessage(fileResponse, fallbackMessage));
      await downloadBlobResponse(fileResponse, filename, extension);
      return;
    }
  }

  throw new Error(`${extension.toUpperCase()} export timed out.`);
};

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
  onStatus,
}) {
  const extension = getOutputExtension(output);
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

  const baseUrl = endpoint ? endpoint.replace(/\/$/, '').replace(/\/render$/, '') : getRendererBaseUrl();

  try {
    await downloadViaJob({ baseUrl, payload, filename, extension, fallbackMessage, onStatus });
  } catch (jobError) {
    onStatus?.('Job export failed, trying direct render...');
    const directEndpoint = `${baseUrl}/render`;
    const response = await postJson(directEndpoint, payload);
    if (!response.ok) throw new Error(await getRenderErrorMessage(response, jobError instanceof Error ? jobError.message : fallbackMessage));
    await downloadBlobResponse(response, filename, extension);
  }
}
