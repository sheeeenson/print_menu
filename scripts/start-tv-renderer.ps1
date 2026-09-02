$ErrorActionPreference = "Stop"

$repoUrl = "https://github.com/sheeeenson/print_menu.git"
$target = Join-Path $env:LOCALAPPDATA "PrintMenuRenderer"

Write-Host ""
Write-Host "Print Menu TV Promo Renderer" -ForegroundColor Cyan
Write-Host "Target: $target"
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is required. Install Node.js LTS first: https://nodejs.org/" -ForegroundColor Red
  throw "Node.js not found."
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "Git is required. Install Git for Windows first: https://git-scm.com/download/win" -ForegroundColor Red
  throw "Git not found."
}

if (Test-Path (Join-Path $target ".git")) {
  Write-Host "Updating renderer..." -ForegroundColor Yellow
  git -C $target fetch origin main
  git -C $target reset --hard origin/main
} else {
  if (Test-Path $target) { Remove-Item -Recurse -Force $target }
  Write-Host "Downloading renderer..." -ForegroundColor Yellow
  git clone --depth 1 --branch main $repoUrl $target
}

$rendererDir = Join-Path $target "local-renderer"
Set-Location $rendererDir

Write-Host "Installing renderer dependencies..." -ForegroundColor Yellow
npm install

Write-Host "Installing Chromium for rendering..." -ForegroundColor Yellow
npx playwright install chromium

$ffmpegPath = node -e "console.log(require('ffmpeg-static'))"
if (-not $ffmpegPath) { throw "Could not resolve bundled FFmpeg." }

$env:FFMPEG_PATH = $ffmpegPath.Trim()
$env:RENDER_SCALE = "2"
$env:MAX_VIDEO_WIDTH = "1920"
$env:MAX_VIDEO_FPS = "24"
$env:MAX_VIDEO_DURATION = "32"

Write-Host ""
Write-Host "Renderer ready settings:" -ForegroundColor Green
Write-Host "  URL: http://localhost:3020"
Write-Host "  Video: up to 1920 px wide / 24 fps"
Write-Host "  Quality: 2x supersampling + H.264 CRF 14"
Write-Host ""
Write-Host "KEEP THIS WINDOW OPEN while downloading MP4 from TV Promo." -ForegroundColor Green
Write-Host ""

npm start
