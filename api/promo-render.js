const DEFAULT_PROMO_RENDERER_URL = 'https://print-menu.onrender.com/render';

const getRendererUrl = () => process.env.PROMO_RENDERER_URL || process.env.REMOTION_RENDERER_URL || DEFAULT_PROMO_RENDERER_URL;

const json = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const getFallbackContentType = (filename = '') => filename.toLowerCase().endsWith('.png') ? 'image/png' : 'video/mp4';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    json(response, 405, { error: 'Method not allowed' });
    return;
  }

  const rendererUrl = getRendererUrl();
  if (!rendererUrl) {
    json(response, 501, {
      error: 'Promo renderer is not configured.',
      detail: 'Set PROMO_RENDERER_URL to a renderer service that accepts the TV promo payload and returns a PNG or MP4 file.',
    });
    return;
  }

  try {
    const rendererResponse = await fetch(rendererUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body ?? {}),
    });

    if (!rendererResponse.ok) {
      let detail = '';
      try {
        detail = await rendererResponse.text();
      } catch (error) {
        detail = rendererResponse.statusText;
      }
      json(response, rendererResponse.status, {
        error: 'Renderer failed to create export file.',
        detail,
      });
      return;
    }

    const fileBuffer = Buffer.from(await rendererResponse.arrayBuffer());
    const filename = request.body?.filename || (request.body?.output === 'png' ? 'promo.png' : 'promo.mp4');
    response.statusCode = 200;
    response.setHeader('Content-Type', rendererResponse.headers.get('Content-Type') || getFallbackContentType(filename));
    response.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '-')}"`);
    response.end(fileBuffer);
  } catch (error) {
    json(response, 500, {
      error: 'Unable to contact promo renderer.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
