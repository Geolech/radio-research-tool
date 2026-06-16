// Electron-Hauptprozess
// Startet im gepackten Zustand den gebündelten Next.js-Standalone-Server
// (autark, kein externer Dev-Server) und öffnet das Radio Research Tool.
const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const net = require("net");

const isDev = !app.isPackaged;
const ROUTE = "/radio";

let serverProcess = null;
let mainWindow = null;

// Freien Port auf 127.0.0.1 finden
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

// Warten, bis der Server antwortet
function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.destroy();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error("Server-Timeout"));
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}

// Standalone-Server als Kindprozess starten (über Electrons eigenes Node)
function startServer(port) {
  const standaloneDir = path.join(process.resourcesPath, "standalone");
  const serverJs = path.join(standaloneDir, "server.js");
  serverProcess = spawn(process.execPath, [serverJs], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
    },
    stdio: "ignore",
  });
  serverProcess.on("error", (e) => console.error("[server]", e));
}

async function createWindow() {
  let baseUrl;

  if (isDev) {
    // Entwicklung: gegen laufenden `next dev` (npm run dev) auf 3000
    baseUrl = "http://127.0.0.1:3000";
  } else {
    const port = await getFreePort();
    startServer(port);
    baseUrl = `http://127.0.0.1:${port}`;
    await waitForServer(baseUrl + ROUTE);
  }

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#09090b",
    title: "Radio Research Tool",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  // Externe Links (Quellseiten, „Im Browser öffnen") im Standardbrowser öffnen
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(baseUrl + ROUTE);
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    try { serverProcess.kill(); } catch { /* ignore */ }
    serverProcess = null;
  }
}
app.on("before-quit", stopServer);
app.on("quit", stopServer);
process.on("exit", stopServer);
