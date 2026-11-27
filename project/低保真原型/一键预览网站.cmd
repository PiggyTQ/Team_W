@echo off
setlocal EnableExtensions
title Avemly - Local Web Preview
pushd "%~dp0" || exit /b 1

where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install Node.js 24 and reopen this file.
  goto failed
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Project dependencies are missing. Run npm ci in this folder once.
  goto failed
)

set "CAREER_API_PROXY="
set "VITE_AUTH_MODE=demo"
set "VITE_LOCAL_SOURCE_PREVIEW=1"
echo Opening the local preview. Keep this window open while using the website.
node "node_modules\vite\bin\vite.js" --mode development --host 127.0.0.1 --port 5198 --no-strictPort --open /scripts/local-web-preview.html
if errorlevel 1 goto failed

popd
exit /b 0

:failed
echo The local preview could not start.
pause
popd
exit /b 1
