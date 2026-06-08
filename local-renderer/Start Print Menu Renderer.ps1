$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "Starting Print Menu Local Renderer..."
Write-Host "Folder: $PSScriptRoot"
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is required. Install it from https://nodejs.org and run this launcher again."
  Read-Host "Press Enter to close"
  exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
}

Write-Host "Checking Playwright Chromium..."
npx playwright install chromium

if (-not (Test-Path "bin\ffmpeg.exe") -and -not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Host "FFmpeg was not found."
  Write-Host "Put ffmpeg.exe into:"
  Write-Host "$PSScriptRoot\bin\ffmpeg.exe"
  Read-Host "Press Enter to close"
  exit 1
}

Write-Host ""
Write-Host "Renderer will run at http://localhost:3020"
Write-Host "Keep this window open while exporting MP4/WebM from the website."
Write-Host ""

npm start
Read-Host "Press Enter to close"
