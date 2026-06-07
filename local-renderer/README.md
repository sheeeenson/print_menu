# Print Menu Local Renderer

Local renderer for TV Promo MP4/WebM export.

It runs on your computer at:

```txt
http://localhost:3020
```

The website can use it for video export while keeping PNG and HTML export in the browser.

## Requirements

- Node.js 18+
- FFmpeg installed and available in PATH

Mac:

```bash
brew install ffmpeg
```

Windows:

Install FFmpeg and add it to PATH.

## Setup

```bash
cd local-renderer
npm install
npm run setup
npm start
```

When it is running, open:

```txt
http://localhost:3020/health
```

You should see JSON with:

```json
{"ok":true,"renderer":"print-menu-local-renderer"}
```

## Render limits

Defaults:

```txt
PORT=3020
MAX_VIDEO_WIDTH=1920
MAX_VIDEO_FPS=24
MAX_VIDEO_DURATION=20
MAX_BODY_SIZE=80mb
```

You can lower these if your computer is slow.
