import { app, BrowserWindow, globalShortcut, Menu, shell } from "electron";
import * as path from "path";
import { IPCService } from "./services/IPCService";

// 热重载由 nodemon 处理，不需要 electron-reloader

// IPC服务实例
let ipcService: IPCService | null = null;

// 保持对窗口对象的全局引用，避免被垃圾回收
let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow(): void {
  console.log("createWindow", mainWindow);

  // 如果窗口已存在，先关闭它
  if (mainWindow) {
    return;
  }
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "AssetPulse Framework",
    webPreferences: {
      // 不允许在渲染进程中使用 node 模块
      nodeIntegration: false,
      // 启用 contextIsolation 以使用 contextBridge
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "../resources/icon.svg"),
    show: false, // 先不显示，等加载完成后再显示
    titleBarStyle: "default",
  });

  // 加载应用逻辑封装
  const loadRenderer = async () => {
    if (isDev) {
      try {
        await mainWindow?.loadURL("http://localhost:5173");
        // 开发环境下加载成功后打开开发者工具
        // mainWindow?.webContents.openDevTools();
      } catch (e) {
        console.log("Vite server not ready, retrying in 1s...", e);
        setTimeout(loadRenderer, 1000);
      }
    } else {
      try {
        await mainWindow?.loadFile(path.join(__dirname, "renderer/index.html"));
      } catch (e) {
        console.error("Failed to load file:", e);
      }
    }
  };

  // 执行加载
  loadRenderer();

  // 当窗口准备好时显示
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (mainWindow && ipcService) {
      ipcService.setWindow(mainWindow);
    }
  });

  // 监听加载失败事件（如刷新时服务断开）
  mainWindow.webContents.on("did-fail-load", () => {
    console.log("Page failed to load, retrying...");
    if (isDev) {
      setTimeout(loadRenderer, 1000);
    }
  });

  // 当窗口被关闭时触发
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow?.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  // 初始化IPC服务
  ipcService = new IPCService();

  createWindow();

  // 在 macOS 上，当所有窗口都关闭时，应用通常会保持活跃状态
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
    console.log("activate", BrowserWindow.getAllWindows().length);
  });

  // 创建应用菜单
  createMenu();
});

// 防止在开发环境中创建多个窗口
if (isDev) {
  // 在开发环境中，确保只有一个主窗口
  app.on("browser-window-created", (_, window) => {
    console.log("窗口创建事件:", window.id, mainWindow?.id);
    if (window !== mainWindow && window !== null && mainWindow !== null) {
      console.log("检测到额外的窗口，正在关闭...");
      window.close();
    }
  });

  // 确保应用单例运行
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on("second-instance", () => {
      // 当有人试图运行第二个实例时，聚焦到我们的窗口
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }
}

// 快捷键打开关闭devtools，默认是ctrl+shift+i
app.on("ready", () => {
  globalShortcut.register("CmdOrCtrl+Shift+I", () => {
    mainWindow?.webContents.toggleDevTools();
  });
});
// 当所有窗口都关闭时退出应用
app.on("window-all-closed", () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 应用即将退出时的清理工作
app.on("before-quit", () => {
  console.log("应用即将退出，清理资源...");
  if (mainWindow) {
    mainWindow = null;
  }

  // 清理IPC服务
  if (ipcService) {
    ipcService.cleanup();
    ipcService = null;
  }
});

// 应用退出时的最终清理
app.on("will-quit", () => {
  console.log("应用正在退出...");
  // 取消注册所有全局快捷键
  globalShortcut.unregisterAll();
});

// 创建应用菜单
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [];

  // macOS 需要特殊的应用菜单
  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        {
          label: "关于 " + app.getName(),
          role: "about",
        },
        { type: "separator" },
        {
          label: "服务",
          role: "services",
          submenu: [],
        },
        { type: "separator" },
        {
          label: "隐藏 " + app.getName(),
          accelerator: "Command+H",
          role: "hide",
        },
        {
          label: "隐藏其他",
          accelerator: "Command+Shift+H",
          role: "hideOthers",
        },
        {
          label: "显示全部",
          role: "unhide",
        },
        { type: "separator" },
        {
          label: "退出",
          accelerator: "Command+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    });
  }

  // 文件菜单
  template.push({
    label: "文件",
    submenu: [
      {
        label: "新建",
        accelerator: "CmdOrCtrl+N",
        click: () => {
          console.log("新建文件");
        },
      },
      {
        label: "打开",
        accelerator: "CmdOrCtrl+O",
        click: () => {
          console.log("打开文件");
        },
      },
      { type: "separator" },
      ...(process.platform !== "darwin"
        ? [
            {
              label: "退出",
              accelerator: "Ctrl+Q",
              click: () => {
                app.quit();
              },
            },
          ]
        : []),
    ],
  });

  // 编辑菜单
  template.push({
    label: "编辑",
    submenu: [
      { label: "撤销", accelerator: "CmdOrCtrl+Z", role: "undo" },
      { label: "重做", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
      { type: "separator" },
      { label: "剪切", accelerator: "CmdOrCtrl+X", role: "cut" },
      { label: "复制", accelerator: "CmdOrCtrl+C", role: "copy" },
      { label: "粘贴", accelerator: "CmdOrCtrl+V", role: "paste" },
    ],
  });

  // 视图菜单
  template.push({
    label: "视图",
    submenu: [
      { label: "重新加载", accelerator: "CmdOrCtrl+R", role: "reload" },
      {
        label: "强制重新加载",
        accelerator: "CmdOrCtrl+Shift+R",
        role: "forceReload",
      },
      {
        label: "切换开发者工具",
        accelerator:
          process.platform === "darwin" ? "Alt+Cmd+I" : "Ctrl+Shift+I",
        role: "toggleDevTools",
      },
      { type: "separator" },
      { label: "实际大小", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
      { label: "放大", accelerator: "CmdOrCtrl+Plus", role: "zoomIn" },
      { label: "缩小", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
      { type: "separator" },
      { label: "切换全屏", accelerator: "F11", role: "togglefullscreen" },
    ],
  });

  // 窗口菜单
  template.push({
    label: "窗口",
    submenu: [
      { label: "最小化", accelerator: "CmdOrCtrl+M", role: "minimize" },
      { label: "关闭", accelerator: "CmdOrCtrl+W", role: "close" },
      ...(process.platform === "darwin"
        ? [
            { type: "separator" as const },
            { label: "前置所有窗口", role: "front" as const },
          ]
        : []),
    ],
  });

  // 帮助菜单
  template.push({
    label: "帮助",
    submenu: [
      {
        label: "关于",
        click: () => {
          console.log("关于应用");
        },
      },
    ],
  });

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
