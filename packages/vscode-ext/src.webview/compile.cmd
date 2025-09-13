@echo off
REM Compile a TypeScript file to JavaScript
npx tsc --outDir ../media --project tsconfig.json
echo Compilation complete.
pause
