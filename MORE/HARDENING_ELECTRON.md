Because your app is strictly local and offline, Chromium CVEs in Electron carry drastically lower risk—and you can enforce that offline boundary directly in Electron's runtime code.
For an enterprise reviewer, a local-only, air-gap-compatible Electron app is dramatically easier to approve than one that renders remote websites, because almost all high-severity Chromium exploits require loading malicious remote web content.

1. How to state this in SECURITY.md

Add an Application Architecture & Attack Surface section (or place it right under End-User Posture) so reviewers immediately understand why Chromium/Electron CVEs rarely translate into real-world exploits in your app:
markdown

### Application Architecture & Attack Surface

This application is designed as a **strictly offline, local-only tool**:

- **No Remote Content:** The renderer loads exclusively local, bundled HTML, CSS, JavaScript, and static assets. It never loads remote URLs (`http://` or `https://`) or untrusted third-party web scripts.
- **Zero Network Usage:** The application makes no outbound network requests and functions identically in an air-gapped environment.
- **Local Storage Only:** All data reads and writes are confined to local files and a local SQLite database.

**Impact on Triage:** Because the embedded Chromium engine never processes untrusted remote web content, Chromium-specific vulnerabilities (such as renderer RCEs triggered by malicious websites) are generally unreachable unless local input parsing is affected. Even so, Electron is kept reasonably current to maintain baseline runtime hygiene.
Use code with caution.

2. Electron API & Build Options to Enforce Offline Isolation

Even though your code doesn't intentionally make network calls, explicitly locking down Electron at runtime proves to security auditors that accidental or injected network requests will be blocked at the OS/Chromium boundary.

A. Block all network requests in the main process (session.webRequest)

In your main process (main.ts / index.ts), intercept all outbound requests on the default session and cancel anything that isn't a local file or internal Electron/DevTools protocol:
typescript
import { app, session } from 'electron';

app.whenReady().then(() => {
// Block all outbound network traffic (HTTP, HTTPS, WebSockets, etc.)
session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
const allowedProtocols = ['file:', 'devtools:', 'chrome-extension:'];
const url = new URL(details.url);

    if (allowedProtocols.includes(url.protocol)) {
      callback({ cancel: false });
    } else {
      console.warn(`Blocked outbound network request: ${details.url}`);
      callback({ cancel: true });
    }

});
});
Use code with caution.

B. Set a strict Content Security Policy (CSP) in index.html

Add a <meta> tag to your bundled HTML file so Chromium refuses to load external scripts, styles, fonts, or fetch/XHR connections even if a dependency tries to phone home (e.g., hidden telemetry):
html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none';"
/>
Use code with caution.
(Note: connect-src 'none' completely disables fetch(), XMLHttpRequest, and WebSocket inside the renderer, while 'unsafe-inline' in style-src is often needed if React/CSS-in-JS injects style tags.)

C. Harden BrowserWindow webPreferences & Navigation

Follow Electron's official security checklist when creating your window so local code cannot escalate privileges or open external links inside the app:
typescript
const mainWindow = new BrowserWindow({
webPreferences: {
contextIsolation: true, // Default in modern Electron; keep true
nodeIntegration: false, // Default in modern Electron; keep false
sandbox: true, // Restricts renderer OS access
webSecurity: true, // Enforces same-origin policy
allowRunningInsecureContent: false,
preload: path.join(__dirname, 'preload.js'),
},
});

// Prevent any link or window.open() from navigating away from your local app
mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
mainWindow.webContents.on('will-navigate', (event) => {
event.preventDefault();
});
Use code with caution.

D. Electron Fuses (Build-time hardening in Electron Forge)

If you use Electron Forge, you can flip Electron Fuses (@electron/fuses) in your forge.config.ts to permanently disable dangerous features at the binary level before packaging:
• RunAsNode: false — Prevents attackers from using your app's binary as a generic Node.js CLI (ELECTRON_RUN_AS_NODE=1).
• EnableNodeCliInspectArguments: false — Disables --inspect debugging flags in production builds.
• OnlyLoadAppFromAsar: true — Ensures Electron only loads code from your packaged .asar archive.
Would you like a quick snippet showing how to configure @electron/fuses inside forge.config.ts, or a consolidated final SECURITY.md that pulls together all of these points cleanly?
