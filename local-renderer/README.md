# Print Menu Local Renderer

Local renderer for TV Promo MP4/WebM export.

It runs on your computer at:

```txt
http://localhost:3020
```

The website can use it for video export while keeping PNG and HTML export in the browser.

## Download packages for users

Build release ZIP files from this folder:

```bash
npm install
npm run package
```

The script creates:

```txt
local-renderer/dist/Print-Menu-Renderer-Mac.zip
local-renderer/dist/Print-Menu-Renderer-Windows.zip
```

Upload both files to the latest GitHub Release. The website download panel expects these asset names:

```txt
Print-Menu-Renderer-Mac.zip
Print-Menu-Renderer-Windows.zip
```

## Mac setup

1. Download and unzip:

```txt
Print-Menu-Renderer-Mac.zip
```

2. Put the FFmpeg executable here if it is not already included:

```txt
Print Menu Renderer Mac/bin/ffmpeg
```

3. Make it executable if needed:

```bash
chmod +x "bin/ffmpeg"
xattr -d com.apple.quarantine "bin/ffmpeg" || true
```

4. Start the renderer by double-clicking:

```txt
Start Print Menu Renderer.command
```

The launcher window should stay open and show that the renderer is running. Keep it open while exporting MP4/WebM from the website.

## Windows setup

1. Download and unzip:

```txt
Print-Menu-Renderer-Windows.zip
```

2. Put the FFmpeg executable here if it is not already included:

```txt
Print Menu Renderer Windows\bin\ffmpeg.exe
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
- Chromium installed by Playwright on first run
- FFmpeg either in `bin/ffmpeg`, `bin/ffmpeg.exe`, or available in PATH
- Internet connection on first run to install npm dependencies and Playwright Chromium

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

## Future installer track

The current release format is ZIP packages with launchers.

The next installer step can be a desktop wrapper that bundles the runtime and produces:

- macOS `.dmg`
- Windows `.exe`

Recommended path: Electron + electron-builder, or a smaller native wrapper if we want to keep the renderer minimal.
