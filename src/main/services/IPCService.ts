import { ipcMain, BrowserWindow, dialog } from "electron";
import { DatabaseManager } from "../database/DatabaseManager";
import { FofaService } from "./FofaService";
import { ProbeService } from "./ProbeService";
import { ReportService } from "./ReportService";

export class IPCService {
  private db: DatabaseManager;
  private fofaService: FofaService;
  private probeService: ProbeService;
  private reportService: ReportService;
  private window: BrowserWindow | null = null;

  constructor() {
    this.db = new DatabaseManager();
    this.probeService = new ProbeService(this.db);
    this.fofaService = new FofaService(this.db, this.probeService);
    this.reportService = new ReportService();
    this.setupHandlers();

    this.probeService.setCallbacks(
      (progress) => this.send("probe:progress", progress),
      (isProbing) => this.send("probe:status", isProbing),
      (asset) => this.send("asset:update", asset),
      () => this.send("probe:round-complete", null)
    );
  }

  public setWindow(window: BrowserWindow) {
    this.window = window;
  }

  private send(channel: string, data: any) {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  private setupHandlers(): void {
    // App
    ipcMain.handle("app:restart", () => {
      // Relaunch the application and exit the current instance
      const { app } = require("electron");
      app.relaunch();
      app.exit(0);
    });

    // Config
    ipcMain.handle("config:get", (_, key: string) => {
      return this.db.getConfig(key);
    });

    ipcMain.handle("config:set", (_, key: string, value: string) => {
      return this.db.setConfig(key, value);
    });

    // Fofa
    ipcMain.handle(
      "fofa:search",
      async (_, query: string, size: number, onlyAlive: boolean) => {
        return await this.fofaService.search(
          query,
          size,
          onlyAlive,
          (stage, current, total) => {
            this.send("import:progress", { stage, current, total });
          }
        );
      }
    );

    // Proxy
    ipcMain.handle("proxy:test", async (_, proxyUrl: string) => {
      return await this.fofaService.testProxy(proxyUrl);
    });

    // Assets
    ipcMain.handle("assets:get", () => {
      return this.db.getAssets();
    });

    ipcMain.handle("assets:clear", () => {
      this.db.clearAssets();
      this.db.clearHistory(); // Also clear history when assets are cleared, or provide separate handle?
      // User requirement: "清空所有数据" usually implies a fresh start.
      return;
    });

    ipcMain.handle("assets:by-region", () => {
      return this.db.getAssetsByRegion();
    });

    // History
    ipcMain.handle("history:get", () => {
      return this.db.getProbeHistory();
    });

    // Probe
    ipcMain.handle("probe:start", (_, interval?: number) => {
      const assets = this.db.getAssets();
      if (assets.length === 0) {
        throw new Error("暂无资产，无法开始探活");
      }

      // Run in background, don't await
      // Default to loop mode as requested by user ("Cyclic probing")
      let loopInterval = interval;
      if (!loopInterval) {
        const stored = this.db.getConfig("probeInterval");
        loopInterval = stored ? parseInt(stored) * 1000 : 30000; // stored is in seconds, convert to ms
      }

      const storedConcurrency = this.db.getConfig("probeConcurrency");
      const concurrency = storedConcurrency ? parseInt(storedConcurrency) : 200;

      this.probeService.startLoop(loopInterval, concurrency);
      return "Started Loop";
    });

    ipcMain.handle("probe:stop", () => {
      this.probeService.stop();
      return "Stopped";
    });

    ipcMain.handle("probe:is-running", () => {
      return this.probeService.getIsProbing();
    });

    ipcMain.handle("probe:status", () => {
      return {
        isProbing: this.probeService.getIsProbing(),
        progress: this.probeService.getProgress(),
      };
    });

    // Report
    ipcMain.handle("report:export", async (_, type: "excel" | "html") => {
      if (!this.window) return { success: false, message: "Window not found" };

      const history = this.db.getProbeHistory(1000); // Get last 1000 records
      if (history.length === 0) {
        return { success: false, message: "当前无历史趋势数据可导出" };
      }

      const options: any = {
        title: `导出存活趋势 ${type === "excel" ? "Excel" : "HTML"} 报告`,
        defaultPath: `AssetPulse_Trend_Report_${Date.now()}.${
          type === "excel" ? "csv" : "html"
        }`,
        filters: [
          type === "excel"
            ? { name: "CSV / Excel", extensions: ["csv"] }
            : { name: "HTML", extensions: ["html"] },
        ],
      };

      const { canceled, filePath } = await dialog.showSaveDialog(
        this.window,
        options
      );

      if (canceled || !filePath) {
        return { success: false, message: "已取消导出" };
      }

      try {
        if (type === "excel") {
          await this.reportService.exportHistoryToCSV(filePath, history);
        } else {
          await this.reportService.exportHistoryToHTML(filePath, history);
        }
        return { success: true, message: "导出成功" };
      } catch (error: any) {
        console.error("Export error:", error);
        return { success: false, message: `导出失败: ${error.message}` };
      }
    });
  }

  public cleanup(): void {
    this.probeService.stop();
  }
}
