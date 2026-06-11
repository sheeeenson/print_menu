const DEFAULT_RENDERER_ENDPOINT = 'https://print-menu.onrender.com/render';
const DEFAULT_LOCAL_RENDERER_BASE_URL = 'http://localhost:3020';
const JOB_POLL_INTERVAL_MS = 1200;
const JOB_TIMEOUT_MS = 300000;
const LOCAL_HEALTH_TIMEOUT_MS = 900;

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

const getLocalRendererBaseUrl = () => (
  import.meta.env?.VITE_LOCAL_RENDERER_URL || DEFAULT_LOCAL_RENDERER_BASE_URL
).replace(/\/$/, '');

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
  link.rel = 'noopener';
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
  setTimeout(() => URL.revokeObjectURL(fileUrl), 30000);
};

const isLocalRendererAvailable = async (baseUrl) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOCAL_HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    if (!response.ok) return false;
    const payload = await response.json().catch(() => null);
    return Boolean(payload?.ok);
  } catch (error) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const getProgressText = ({ status, extension, rendererLabel, progress }) => {
  const label = rendererLabel || 'renderer';
  const percent = Number(progress?.percent);
  const currentFrame = Number(progress?.currentFrame);
  const totalFrames = Number(progress?.totalFrames);

  if (status === 'queued') return `Render job queued via ${label}...`;
  if (status === 'done') return `Finishing ${extension.toUpperCase()}... 100%`;
  if (status !== 'rendering') return `Render job ${status}...`;

  if (Number.isFinite(percent) && percent > 0) {
    const frameText = Number.isFinite(currentFrame) && Number.isFinite(totalFrames) && totalFrames > 0
      ? ` (${currentFrame}/${totalFrames} frames)`
      : '';
    return `Rendering ${extension.toUpperCase()} via ${label}... ${percent}%${frameText}`;
  }

  const stage = progress?.stage === 'opening_browser'
    ? 'opening browser'
    : progress?.stage === 'encoding_video'
      ? 'encoding video'
      : 'starting render';
  return `Rendering ${extension.toUpperCase()} via ${label}... ${stage}`;
};

const downloadViaJob = async ({ baseUrl, payload, filename, extension, fallbackMessage, onStatus, rendererLabel }) => {
  onStatus?.(`Creating ${rendererLabel || 'render'} job...`);
  const createResponse = await postJson(`${baseUrl}/jobs`, payload);
  if (!createResponse.ok) throw new Error(await getRenderErrorMessage(createResponse, fallbackMessage));

  const job = await createResponse.json();
  const jobId = job.id;
  if (!jobId) throw new Error('Renderer did not return a job id.');
  onStatus?.(getProgressText({ status: job.status, extension, rendererLabel, progress: job.progress }));

  const startedAt = Date.now();
  while (Date.now() - startedAt < JOB_TIMEOUT_MS) {
    await wait(JOB_POLL_INTERVAL_MS);
    const statusResponse = await fetch(`${baseUrl}/jobs/${jobId}`);
    if (!statusResponse.ok) throw new Error(await getRenderErrorMessage(statusResponse, fallbackMessage));

    const status = await statusResponse.json();
    onStatus?.(getProgressText({ status: status.status, extension, rendererLabel, progress: status.progress }));

    if (status.status === 'failed') throw new Error(status.error || fallbackMessage);
    if (status.status === 'done') {
      const fileUrl = `${baseUrl}/jobs/${jobId}/file`;
      onStatus?.(`Downloading ${extension.toUpperCase()}... 100%`);
      downloadUrl(fileUrl, filename);
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

  const cloudBaseUrl = endpoint ? endpoint.replace(/\/$/, '').replace(/\/render$/, '') : getRendererBaseUrl();
  const localBaseUrl = getLocalRendererBaseUrl();
  const shouldTryLocal = output === 'mp4' || output === 'webm';

  if (shouldTryLocal) {
    onStatus?.('Checking local renderer...');
    if (await isLocalRendererAvailable(localBaseUrl)) {
      try {
        await downloadViaJob({ baseUrl: localBaseUrl, payload, filename, extension, fallbackMessage, onStatus, rendererLabel: 'local renderer' });
        return;
      } catch (localError) {
        console.error(localError);
        onStatus?.('Local renderer failed, trying cloud renderer...');
      }
    } else {
      onStatus?.('Local renderer not found, trying cloud renderer...');
    }
  }

  try {
    await downloadViaJob({ baseUrl: cloudBaseUrl, payload, filename, extension, fallbackMessage, onStatus, rendererLabel: 'cloud renderer' });
  } catch (jobError) {
    onStatus?.('Job export failed, trying direct render...');
    const directEndpoint = `${cloudBaseUrl}/render`;
    const response = await postJson(directEndpoint, payload);
    if (!response.ok) throw new Error(await getRenderErrorMessage(response, jobError instanceof Error ? jobError.message : fallbackMessage));
    await downloadBlobResponse(response, filename, extension);
  }
}
