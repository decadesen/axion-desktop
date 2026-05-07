const { app, BrowserWindow, screen } = require("electron");
const path = require("node:path");

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const forceKioskMode = process.env.ELECTRON_KIOSK_MODE === "true";
const kioskMode = forceKioskMode || (!isDev && process.env.PET_KIOSK !== "false");
const openDevTools = process.env.ELECTRON_OPEN_DEVTOOLS === "true";
const ozonePlatform = process.platform === "linux" ? (process.env.OZONE_PLATFORM || "wayland") : null;
let mainWindow = null;

const parseWindowSize = (value, fallback) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const devWindowBounds = {
  width: parseWindowSize(process.env.DEV_WINDOW_WIDTH, 1280),
  height: parseWindowSize(process.env.DEV_WINDOW_HEIGHT, 860),
};

if (isDev) {
  app.setPath("userData", path.join(app.getPath("appData"), "axion-desktop-dev"));
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

const windowBounds = kioskMode
  ? {
      width: 640,
      height: 360,
    }
  : {
      width: devWindowBounds.width,
      height: devWindowBounds.height,
      minWidth: devWindowBounds.width,
      minHeight: devWindowBounds.height,
    };

const getPrimaryDisplayBounds = () => {
  const display = screen.getPrimaryDisplay();
  return display?.workArea ?? display?.bounds ?? { x: 0, y: 0, width: 800, height: 480 };
};

const showMainWindow = (kioskBounds) => {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isVisible()) return;
  mainWindow.show();
  if (kioskMode && kioskBounds) {
    const { x, y, width, height } = kioskBounds;
    mainWindow.setBounds({ x, y, width, height });
    mainWindow.setContentSize(width, height);
    mainWindow.setAlwaysOnTop(true, "screen-saver");
    mainWindow.focus();
  }
};

if (process.platform === "linux") {
  app.commandLine.appendSwitch("ignore-gpu-blocklist");
  app.commandLine.appendSwitch("enable-features", "UseOzonePlatform");
  app.commandLine.appendSwitch("ozone-platform", ozonePlatform === "x11" ? "x11" : "wayland");
  app.commandLine.appendSwitch("disable-vulkan");
  app.commandLine.appendSwitch(
    "disable-features",
    ozonePlatform === "wayland" ? "WaylandWindowDecorations,Vulkan" : "Vulkan",
  );
}

const createWindow = async () => {
  const kioskBounds = kioskMode ? getPrimaryDisplayBounds() : null;
  mainWindow = new BrowserWindow({
    ...(kioskBounds
      ? {
          x: kioskBounds.x,
          y: kioskBounds.y,
          width: kioskBounds.width,
          height: kioskBounds.height,
        }
      : windowBounds),
    backgroundColor: "#0e111c",
    autoHideMenuBar: true,
    frame: !kioskMode,
    hasShadow: !kioskMode,
    fullscreen: kioskMode,
    kiosk: false,
    resizable: !kioskMode,
    movable: !kioskMode,
    minimizable: !kioskMode,
    maximizable: !kioskMode,
    show: kioskMode,
    skipTaskbar: kioskMode,
    type: "normal",
    title: "Axion-desktop",
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("[electron] render process gone", details);
  });

  mainWindow.webContents.on("did-fail-load", (_event, code, description, validatedURL) => {
    console.error(`[electron] did-fail-load ${code}: ${description} ${validatedURL}`);
  });

  mainWindow.webContents.once("did-finish-load", () => {
    showMainWindow(kioskBounds);
  });

  if (isDev) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    if (openDevTools) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    await mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    showMainWindow(kioskBounds);
  });

  setTimeout(() => {
    showMainWindow(kioskBounds);
  }, 3000).unref();
};

if (gotSingleInstanceLock) {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.whenReady().then(createWindow);
}

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
