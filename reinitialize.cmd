del package-lock.json
rmdir /s /q node_modules
rmdir /s /q  packages\electron-app\node_modules
rmdir /s /q  packages\vscode-ext\node_modules
npm install
git status --ignored