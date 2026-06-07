# Print Menu Local Renderer

Local renderer for TV Promo MP4/WebM export.

It runs on your computer at:

```txt
http://localhost:3020
```

The website can use it for video export while keeping PNG and HTML export in the browser.

## Mac setup

1. Put the FFmpeg executable here:

```txt
local-renderer/bin/ffmpeg
```

2. Make it executable:

```bash
chmod +x bin/ffmpeg
xattr -d com.apple.quarantine bin/ffmpeg || true
```

3. Install dependencies once:

```bash
npm install
npm run setup
```

4. Start the renderer by double-clicking:

```txt
Start Print Menu Renderer.command
```

or run:

```bash
npm start
```

## Windows setup

1. Put the FFmpeg executable here:

```txt
local-renderer\bin\ffmpeg.exe
```

2. Install dependencies once:

```bat
npm install
npm run setup
```

3. Start the renderer by double-clicking:

```txt
Start Print Menu Renderer.bat
```

Alternative PowerShell launcher:

```txt
Start Print Menu Renderer.ps1
```

If Windows blocks the PowerShell script, right-click it and choose **Run with PowerShell**, or run:

```powershell
powershell -ExecutionPolicy Bypass -File "Start Print Menu Renderer.ps1"
```

## Health check

When it is running, open:

```txt
http://localhost:3020/health
```

You should see JSON with:

```json
{"ok":true,"renderer":"print-menu-local-renderer"}
```

## Requirements

- Node.js 18+
- Chromium installed by Playwright via `npm run setup`
- FFmpeg either in `local-renderer/bin/ffmpeg`, `local-renderer/bin/ffmpeg.exe`, or available in PATH

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
