@echo off
REM Compile a TypeScript file to JavaScript
npx tsc -build "%~dp0tsconfig.webview.json"
echo Compilation complete.
pause
