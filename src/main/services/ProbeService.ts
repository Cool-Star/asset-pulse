import * as net from "net";
import * as http from "http";
import * as https from "https";
import { URL } from "url";
import { exec } from "child_process";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { DatabaseManager } from "../database/DatabaseManager";

type ProgressCallback = (progress: {
  current: number;
  total: number;
  alive: number;
}) => void;
type StatusCallback = (isProbing: boolean) => void;
type AssetUpdateCallback = (asset: any) => void;
type RoundCompleteCallback = () => void;

export class ProbeService {
  private db: DatabaseManager;
  private isProbing: boolean = false;
  private isLooping: boolean = false;
  private loopTimer: any = null;

  private onProgress: ProgressCallback | null = null;
  private onStatusChange: StatusCallback | null = null;
  private onAssetUpdate: AssetUpdateCallback | null = null;
  private onRoundComplete: RoundCompleteCallback | null = null;

  private currentProgress = { current: 0, total: 0, alive: 0 };
  private probeRunId: number = 0;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public setCallbacks(
    onProgress: ProgressCallback,
    onStatusChange: StatusCallback,
    onAssetUpdate: AssetUpdateCallback,
    onRoundComplete?: RoundCompleteCallback
  ) {
    this.onProgress = onProgress;
    this.onStatusChange = onStatusChange;
    this.onAssetUpdate = onAssetUpdate;
    if (onRoundComplete) {
      this.onRoundComplete = onRoundComplete;
    }
  }

  public getIsProbing(): boolean {
    return this.isProbing || this.isLooping;
  }

  public getProgress() {
    return this.currentProgress;
  }

  async startLoop(
    defaultInterval: number = 30000,
    defaultConcurrency: number = 200
  ): Promise<void> {
    if (this.isLooping) return;
    this.isLooping = true;
    this.notifyStatus();

    // Use a while loop instead of recursion to keep stack clean and logic linear
    while (this.isLooping) {
      // Dynamic Config Loading: Always fetch latest config from DB
      const storedConcurrency = this.db.getConfig("probeConcurrency");
      const concurrency = storedConcurrency
        ? parseInt(storedConcurrency)
        : defaultConcurrency;

      await this.probeAll(concurrency);

      // Check again if we should continue
      if (!this.isLooping) break;

      // Dynamic Interval Loading
      const storedInterval = this.db.getConfig("probeInterval");
      const interval = storedInterval
        ? parseInt(storedInterval) * 1000
        : defaultInterval;

      // Wait for interval
      await new Promise((resolve) => {
        this.loopTimer = setTimeout(resolve, interval);
      });
    }
  }

  // runLoop removed in favor of while loop in startLoop

  async probeAll(concurrency: number = 200): Promise<void> {
    if (this.isProbing) return;
    this.isProbing = true;
    this.notifyStatus();

    try {
      const currentRunId = ++this.probeRunId;
      const assets = this.db.getAssets();
      const total = assets.length;
      let processed = 0;
      let aliveCount = 0;

      // STRICT: Reset progress at start of probe
      this.currentProgress = { current: 0, total, alive: 0 };
      if (this.onProgress) {
        this.onProgress(this.currentProgress);
      }

      // STRICT: Validate concurrency
      const safeConcurrency = Math.max(1, Math.min(concurrency, 1000));

      const queue = [...assets];
      const activePromises: Set<Promise<void>> = new Set();

      while (queue.length > 0 || activePromises.size > 0) {
        if (!this.isProbing && !this.isLooping) break;

        // Fill active promises up to concurrency limit
        while (queue.length > 0 && activePromises.size < safeConcurrency) {
          const asset = queue.shift();
          if (!asset) break;

          const task = (async () => {
            try {
              // Check if run ID is still valid before processing
              if (this.probeRunId !== currentRunId) return;

              const isAlive = await this.checkAsset(asset);

              // Check again after await
              if (this.probeRunId !== currentRunId) return;

              // STRICT: Increment progress only after completion
              if (isAlive) aliveCount++;
              processed++;
              this.currentProgress = {
                current: processed,
                total,
                alive: aliveCount,
              };
              if (this.onProgress) {
                this.onProgress(this.currentProgress);
              }
            } catch (error) {
              console.error(`Error probing asset ${asset.host}:`, error);
              // Ensure we still count processed even on error to avoid stuck progress
              if (this.probeRunId === currentRunId) {
                processed++;
                this.currentProgress = {
                  current: processed,
                  total,
                  alive: aliveCount,
                };
                if (this.onProgress) this.onProgress(this.currentProgress);
              }
            }
          })();

          // Wrap the task to ensure it's removed from activePromises before resolution is detected by race
          let promise: Promise<void>;
          promise = task.finally(() => {
            activePromises.delete(promise);
          });

          activePromises.add(promise);
        }

        if (activePromises.size > 0) {
          await Promise.race(activePromises);
        }
      }

      if (
        (this.isProbing || this.isLooping) &&
        this.probeRunId === currentRunId
      ) {
        console.log("recordHistory");
        this.recordHistory();
      }
    } finally {
      this.isProbing = false;
      this.notifyStatus();
    }
  }

  private notifyStatus() {
    if (this.onStatusChange) {
      this.onStatusChange(this.isProbing || this.isLooping);
    }
  }

  private recordHistory(): void {
    const stats = this.db.getAssetStats();
    console.log("recordHistory", stats.total, stats.alive);
    this.db.addProbeHistory(stats.total, stats.alive);
    if (this.onRoundComplete) {
      this.onRoundComplete();
    }
  }

  stop(): void {
    this.isLooping = false;
    this.isProbing = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.notifyStatus();
  }

  public async testConnectivity(asset: any): Promise<boolean> {
    const proxy = this.db.getConfig("proxy");
    const proxyEnabled = this.db.getConfig("proxyEnabled") === "true";
    const protocol = (asset.protocol || "").toLowerCase();

    // 1. ICMP (Ping)
    if (protocol === "icmp") {
      if (proxy && proxyEnabled) {
        // ICMP via HTTP proxy is generally not supported
        return false;
      }
      return this.checkAssetIcmp(asset);
    }

    // 2. HTTP/HTTPS (Application Layer)
    if (protocol === "http" || protocol === "https") {
      return this.checkAssetHttp(asset, proxy, proxyEnabled);
    }

    // 3. TCP (Transport Layer) - Default for others (ssh, mysql, etc.)
    if (proxy && proxyEnabled) {
      return this.checkAssetWithProxy(asset, proxy);
    }

    return this.checkAssetTcp(asset);
  }

  private async checkAsset(asset: any): Promise<boolean> {
    const isAlive = await this.testConnectivity(asset);
    this.updateAssetStatus(asset, isAlive ? "alive" : "dead");
    return isAlive;
  }

  private async checkAssetIcmp(asset: any): Promise<boolean> {
    return new Promise((resolve) => {
      const isWin = process.platform === "win32";
      const cmd = isWin
        ? `ping -n 1 -w 2000 ${asset.ip}`
        : `ping -c 1 -W 2 ${asset.ip}`;

      exec(cmd, (error) => {
        const isAlive = !error;
        resolve(isAlive);
      });
    });
  }

  private async checkAssetHttp(
    asset: any,
    proxyUrl: string | null,
    proxyEnabled: boolean
  ): Promise<boolean> {
    const protocol = asset.protocol.toLowerCase();
    const url = `${protocol}://${asset.ip}:${asset.port}`;
    const timeout = 5000;

    const config: any = {
      timeout,
      validateStatus: (status: number) => status >= 200 && status < 500, // Consider 4xx as alive (server reachable)
    };

    if (proxyUrl && proxyEnabled) {
      config.httpsAgent = new HttpsProxyAgent(proxyUrl);
      config.proxy = false; // Disable axios default proxy handling
    } else {
      // Disable certificate verification for direct HTTPS to avoid self-signed errors
      if (protocol === "https") {
        config.httpsAgent = new https.Agent({ rejectUnauthorized: false });
      }
    }

    try {
      await axios.get(url, config);
      return true;
    } catch (error: any) {
      // If we get a response (even 500), it's alive
      if (error.response) {
        return true;
      }
      return false;
    }
  }

  private async checkAssetTcp(asset: any): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 3000;

      let status = "dead";

      socket.setTimeout(timeout);

      socket.on("connect", () => {
        status = "alive";
        socket.destroy();
      });

      socket.on("timeout", () => {
        socket.destroy();
      });

      socket.on("error", (err: any) => {
        socket.destroy();
      });

      socket.on("close", () => {
        resolve(status === "alive");
      });

      socket.connect(parseInt(asset.port), asset.ip);
    });
  }

  private async checkAssetWithProxy(
    asset: any,
    proxyUrl: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const proxy = new URL(proxyUrl);
        const options = {
          host: proxy.hostname,
          port: parseInt(proxy.port),
          method: "CONNECT",
          path: `${asset.ip}:${asset.port}`,
          timeout: 3000,
        };

        const req = http.request(options);

        req.on("connect", (res, socket, head) => {
          if (res.statusCode === 200) {
            socket.destroy();
            resolve(true);
          } else {
            socket.destroy();
            resolve(false);
          }
        });

        req.on("timeout", () => {
          req.destroy();
          resolve(false);
        });

        req.on("error", (err) => {
          resolve(false);
        });

        req.end();
      } catch (e) {
        resolve(false);
      }
    });
  }

  private updateAssetStatus(asset: any, status: string) {
    this.db.updateAssetStatus(asset.id, status);
    if (this.onAssetUpdate) {
      this.onAssetUpdate({ ...asset, status, last_check: Date.now() });
    }
  }
}
