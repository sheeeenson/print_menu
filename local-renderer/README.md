# Print Menu Local Renderer

Local renderer for Print Menu TV Promo MP4/WebM export.

It runs on your computer at:

```text
http://localhost:3020
http://localhost:3020/health
```

The existing command-line workflow is unchanged:

```bash
npm install
npm run setup
npm start
```

## macOS desktop app / DMG

Build the macOS desktop app from a Mac:

```bash
cd local-renderer
npm install
npm run dist:mac
```

The build command does three things:

1. Installs Chromium into `local-renderer/.playwright`.
2. Bundles the Electron desktop shell.
3. Creates DMG files in `local-renderer/dist`.

Expected output names:

```text
Print-Menu-Renderer-0.1.0-arm64.dmg
Print-Menu-Renderer-0.1.0-x64.dmg
```

Use `arm64` for Apple Silicon Macs. Use `x64` for Intel Macs.

### Required ffmpeg file for macOS

For macOS builds, put the ffmpeg binary here before building:

```text
local-renderer/bin/ffmpeg
```

Then make it executable:

```bash
chmod +x local-renderer/bin/ffmpeg
```

The Electron app sets `FFMPEG_PATH` to the bundled file automatically when it exists.

### Running on MacBook

After installing the DMG:

1. Open **Print Menu Renderer.app**.
2. Wait for `Renderer running`.
3. Open Print Menu in the browser.
4. Export MP4/WebM as usual.

Keep the renderer app open while exporting.

## Windows desktop installer / EXE

The old GitHub Release Windows ZIP/launcher is deprecated. Build the new Windows installer from Windows:

```powershell
cd local-renderer
npm install
npm run dist:win
```

Expected output name:

```text
Print-Menu-Renderer-Setup-0.1.0-x64.exe
```

### Required ffmpeg file for Windows

Before building, put FFmpeg here:

```text
local-renderer\bin\ffmpeg.exe
```

The Electron app sets `FFMPEG_PATH` to the bundled file automatically when it exists.

### Running on Windows

After installing the EXE:

1. Open **Print Menu Renderer** from Start Menu or desktop shortcut.
2. Wait for `Renderer running`.
3. Open Print Menu in the browser.
4. Export MP4/WebM as usual.

Keep the renderer app open while exporting.

## Legacy Mac ZIP package

The older Mac ZIP package workflow is still available as fallback:

```bash
npm install
npm run package
```

The script now creates only:

```text
local-renderer/dist/Print-Menu-Renderer-Mac.zip
```

The old Windows ZIP package has been removed from the build script. Use the Windows EXE installer instead.

## Old Mac ZIP setup

1. Download and unzip:

```text
Print-Menu-Renderer-Mac.zip
```

2. Put the FFmpeg executable here if it is not already included:

```text
Print Menu Renderer Mac/bin/ffmpeg
```

3. Make it executable if needed:

```bash
chmod +x "bin/ffmpeg"
xattr -d com.apple.quarantine "bin/ffmpeg" || true
```

4. Start the renderer by double-clicking:

```text
Start Print Menu Renderer.command
```

The launcher window should stay open and show that the renderer is running. Keep it open while exporting MP4/WebM from the website.

## Old Windows ZIP setup

The previous GitHub Release Windows ZIP/launcher is deprecated and should be deleted from GitHub Releases.

Fallback manual command:

```powershell
npm.cmd start
```

## Health check

When it is running, open:

```text
http://localhost:3020/health
```

The desktop app window also shows:

- `stableCssTimeline`
- `gifConversion`
- `gifConversionPipe`

## Requirements for command-line/ZIP mode

- Node.js 18+
- Chromium installed by Playwright on first run
- FFmpeg either in `bin/ffmpeg`, `bin/ffmpeg.exe`, or available in PATH
- Internet connection on first run to install npm dependencies and Playwright Chromium

## Render limits

Defaults:

```text
PORT=3020
MAX_VIDEO_WIDTH=1920
MAX_VIDEO_FPS=24
MAX_VIDEO_DURATION=32
MAX_BODY_SIZE=120mb
```

You can lower these if your computer is slow.
