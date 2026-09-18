@echo off
setlocal

REM Path to the subdirectory containing input/output files
set IMG_DIR=src\renderer\images.org

REM First command
echo building "%IMG_DIR%\google"
call npx @svgr/cli --out-dir "%IMG_DIR%\..\images.tsx\google" --typescript --index-template "%IMG_DIR%\index-template.js" -- "%IMG_DIR%\google"

REM Second command
echo building "%IMG_DIR%\microsoft.imagelibrary"
call npx @svgr/cli --out-dir "%IMG_DIR%\..\images.tsx\microsoft.imagelibrary" --typescript --index-template "%IMG_DIR%\index-template.js" -- "%IMG_DIR%\microsoft.imagelibrary"

REM Third command
echo building "%IMG_DIR%\microsoft.codicons"
call npx @svgr/cli --out-dir "%IMG_DIR%\..\images.tsx\microsoft.codicons" --typescript --index-template "%IMG_DIR%\index-template.js" -- "%IMG_DIR%\microsoft.codicons"

endlocal