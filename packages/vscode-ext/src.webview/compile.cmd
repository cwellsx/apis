@echo off
REM Compile a TypeScript file to JavaScript
npx tsc --outDir "%~dp0..\media" --project "%~dp0tsconfig.webview.json"
echo Compilation complete.
pause
