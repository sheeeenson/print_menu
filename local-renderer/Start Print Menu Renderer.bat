@echo off
setlocal

cd /d "%~dp0"
title Print Menu Local Renderer

echo Starting Print Menu Local Renderer...
echo Folder: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install it from https://nodejs.org and run this launcher again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Checking Playwright Chromium...
call npx playwright install chromium
if errorlevel 1 (
  echo Playwright Chromium install failed.
  pause
  exit /b 1
)

if not exist "bin\ffmpeg.exe" (
  where ffmpeg >nul 2>nul
  if errorlevel 1 (
    echo FFmpeg was not found.
    echo Put ffmpeg.exe into:
    echo %CD%\bin\ffmpeg.exe
    echo.
    pause
    exit /b 1
  )
)

echo Renderer will run at http://localhost:3020
echo Keep this window open while exporting MP4/WebM from the website.
echo.

call npm start
pause
