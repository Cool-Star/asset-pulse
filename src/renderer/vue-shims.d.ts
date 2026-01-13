declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "*.txt?raw" {
  const content: string;
  export default content;
}

// Electron API 类型定义
interface ElectronAPI {
  // 资产相关 API
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  
  // 资产相关
  'assets:import-fofa': (query: string, fofaKey: string) => Promise<any>;
  'assets:get-all': () => Promise<any[]>;
  'assets:get-by-id': (id: number) => Promise<any>;
  'assets:update-status': (id: number, status: string) => Promise<any>;
  'assets:delete': (id: number) => Promise<any>;
  'assets:search': (query: string) => Promise<any[]>;
  
  // 探活相关
  'probe:single': (assetId: number) => Promise<any>;
  'probe:batch': (assetIds: number[]) => Promise<any>;
  'probe:get-records': (assetId?: number, limit?: number) => Promise<any[]>;
  'probe:get-stats': () => Promise<any>;
  
  // 代理相关
  'proxy:get-all': () => Promise<any[]>;
  'proxy:add': (proxy: any) => Promise<any>;
  'proxy:update': (id: number, proxy: any) => Promise<any>;
  'proxy:delete': (id: number) => Promise<any>;
  'proxy:test': (id: number) => Promise<any>;
  'proxy:test-all': () => Promise<any>;
  'proxy:set-default': (id: number) => Promise<any>;
  'proxy:export': () => Promise<any>;
  'proxy:import': (data: any) => Promise<any>;
  
  // 统计相关
  'stats:get-global-distribution': () => Promise<any>;
  'stats:get-country-distribution': () => Promise<any>;
  'stats:get-timeline': (days?: number) => Promise<any>;
  
  // 设置相关
  'settings:get': () => Promise<any>;
  'settings:save': (settings: any) => Promise<any>;
  'settings:reset': () => Promise<any>;
  'settings:export': () => Promise<any>;
  'settings:import': (data: any) => Promise<any>;
  
  // 系统相关
  'system:info': () => Promise<any>;
  'dialog:open-directory': () => Promise<string>;
  
  // 数据管理
  'data:clear-all': () => Promise<any>;
  'data:backup': () => Promise<any>;
  'data:restore': (backupPath: string) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
