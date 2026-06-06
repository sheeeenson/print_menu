# Promo Renderer

Server-side MP4 renderer for the TV Promo export flow.

The main app sends promo HTML, format, duration and FPS to this service. The service opens the HTML in headless Chromium, renders PNG frames and encodes them into an MP4 with ffmpeg.

## Endpoints

- `GET /health` - health check
- `POST /render` - render MP4

## Render deploy

1. Create a new Web Service on Render.
2. Connect this repository.
3. Set Root Directory to:

```text
promo-renderer
```

4. Select Docker runtime.
5. Deploy.
6. Copy the deployed URL and add `/render` at the end.
7. In the main app hosting environment, set:

```bash
PROMO_RENDERER_URL=https://your-render-service.onrender.com/render
```

8. Redeploy the main app.

## Local run with Docker

```bash
docker build -t promo-renderer ./promo-renderer
docker run --rm -p 3000:3000 promo-renderer
```

Health check:

```bash
curl http://localhost:3000/health
```

## Notes

- Free hosting tiers can be slow for video rendering because Chromium and ffmpeg are CPU/RAM heavy.
- For stable production usage, use at least a small paid instance.
- Output is MP4/H.264 with `yuv420p` for broad compatibility.
