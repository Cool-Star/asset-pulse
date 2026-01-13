import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";
import { DatabaseManager } from "../database/DatabaseManager";
import { ProbeService } from "./ProbeService";

export class FofaService {
  private db: DatabaseManager;
  private probeService: ProbeService | null = null;

  constructor(db: DatabaseManager, probeService?: ProbeService) {
    this.db = db;
    if (probeService) {
      this.probeService = probeService;
    }
  }

  async search(
    query: string,
    size: number = 100,
    onlyAlive: boolean = false,
    onProgress?: (stage: string, current: number, total: number) => void
  ): Promise<any> {
    const email = this.db.getConfig("fofaEmail");
    const key = this.db.getConfig("fofaKey");
    const proxy = this.db.getConfig("proxy");
    const proxyEnabled = this.db.getConfig("proxyEnabled") === "true";

    if (!email || !key) {
      throw new Error("请先配置 Fofa Email 和 Key");
    }

    if (onProgress) onProgress("fetching", 0, 0);

    const qbase64 = Buffer.from(query).toString("base64");
    const url = `https://fofa.info/api/v1/search/all?email=${email}&key=${key}&qbase64=${qbase64}&size=${size}&fields=host,ip,port,protocol,country_name,region,city`;

    const config: any = {};
    if (proxy && proxyEnabled) {
      config.httpsAgent = new HttpsProxyAgent(proxy);
      config.proxy = false; // Disable axios default proxy handling
    }

    try {
      const response = await axios.get(url, config);
      if (response.data.error) {
        throw new Error(response.data.errmsg || "Fofa API Error");
      }

      const results = response.data.results; // Array of [host, ip, port, protocol, country, region, city]
      const total = results.length;
      let count = 0;
      let processed = 0;

      this.db.clearAssets();

      if (onProgress) onProgress("processing", 0, total);

      // If onlyAlive is true, we need to probe. Use concurrency.
      if (onlyAlive && this.probeService) {
        const concurrency = 50; // Batch size
        const queue = [...results];
        const activePromises: Set<Promise<void>> = new Set();

        while (queue.length > 0 || activePromises.size > 0) {
          while (queue.length > 0 && activePromises.size < concurrency) {
            const item = queue.shift();
            if (!item) break;

            const promise = (async () => {
              const [host, ip, port, protocol, country, region, city] = item;
              const asset = {
                host,
                ip,
                port,
                protocol,
                region: region || country || "Unknown",
              };

              try {
                // @ts-ignore
                const isAlive = await this.probeService.testConnectivity(asset);
                if (isAlive) {
                  (asset as any).status = "alive";
                  this.db.addAsset(asset);
                  count++;
                }
              } catch (e) {
                // Ignore probe errors
              } finally {
                processed++;
                if (onProgress) onProgress("probing", processed, total);
              }
            })();

            activePromises.add(promise);
            promise.finally(() => activePromises.delete(promise));
          }

          if (activePromises.size > 0) {
            await Promise.race(activePromises);
          }
        }
      } else {
        // Synchronous processing if no probe needed
        for (const item of results) {
          const [host, ip, port, protocol, country, region, city] = item;
          const asset = {
            host,
            ip,
            port,
            protocol,
            region: region || country || "Unknown",
          };

          this.db.addAsset(asset);
          count++;
          processed++;
          // Report progress every 50 items or at the end to avoid IPC flood
          if (processed % 50 === 0 || processed === total) {
             if (onProgress) onProgress("saving", processed, total);
          }
        }
      }

      return {
        count,
        message: onlyAlive
          ? `验证 ${total} 条，成功导入 ${count} 条存活数据`
          : `成功导入 ${count} 条数据`,
      };
    } catch (error: any) {
      console.error("Fofa Search Error:", error);
      throw new Error(error.message || "请求 Fofa 失败");
    }
  }

  async testProxy(
    proxyUrl: string
  ): Promise<{ success: boolean; latency?: number; error?: string }> {
    const config: any = {
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      proxy: false,
      timeout: 5000,
    };
    const start = Date.now();
    try {
      // Try Fofa first as it's our target
      await axios.get("https://fofa.info", config);
      return { success: true, latency: Date.now() - start };
    } catch (error: any) {
      // Fallback to Google just in case Fofa is down but proxy works
      try {
        await axios.get("https://www.google.com", config);
        return { success: true, latency: Date.now() - start };
      } catch (e: any) {
        return { success: false, error: error.message };
      }
    }
  }
}
