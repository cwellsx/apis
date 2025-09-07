@echo off
REM Compile a TypeScript file to JavaScript
npx tsc webview.ts --outDir ../media
echo Compilation complete.
pause
