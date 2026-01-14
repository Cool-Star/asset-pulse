# AssetPulse 💓

> 现代化的资产存活监控与可视化工具 | Modern Asset Liveness Monitoring & Visualization Tool

AssetPulse 是一款基于 Electron + Vue 3 构建的跨平台桌面应用，专为安全团队和资产管理员设计。它深度集成了 FOFA 搜索引擎，支持一键导入资产，提供多协议（ICMP/HTTP/TCP）自动化存活探测，并通过精美的可视化仪表盘实时展示资产状态与趋势。

![Dashboard Preview](resources/icon.png)

## ✨ 核心特性 (Features)

### 🔍 资产集成 (Asset Integration)
- **FOFA 深度集成**：支持使用 FOFA 语法（如 `port="80" && protocol="http"`）直接搜索并批量导入资产。
- **智能过滤**：提供“仅导入存活”模式，在导入阶段自动过滤无效目标。
- **灵活配置**：支持自定义单次获取数量（10 - 10,000 条），适配不同规模的监控需求。

### 📡 多协议探测 (Multi-Protocol Probing)
- **ICMP (Ping)**：底层调用系统 Ping 命令，快速检测网络连通性。
- **HTTP/HTTPS**：自动识别 Web 服务，兼容 200-499 状态码，智能忽略 SSL 证书错误。
- **TCP 连接**：针对 SSH、MySQL、RDP 等非 Web 端口进行 TCP 握手探测。
- **高性能并发**：支持自定义并发数（默认 200，最高 1000）和探测间隔，高效处理大规模资产。

### 📊 可视化监控 (Visual Monitoring)
- **实时心电图**：以 ECG 心电图形式展示实时的探测脉冲，直观感受网络“心跳”。
- **趋势分析**：通过折线图记录“总资产数”与“存活资产数”的历史变化趋势。
- **地域分布**：自动解析资产 IP 归属地，通过饼图展示各地区的资产存活率分布。

### 📑 数据管理 (Data Management)
- **本地数据库**：内置 SQLite (better-sqlite3) 数据库，确保数据隐私与本地化存储。
- **报告导出**：
  - **HTML 报告**：生成包含图表和统计数据的精美 HTML 态势报告。
  - **CSV/Excel**：导出原始扫描数据，便于进行二次分析或存档。

## 🛠 技术栈 (Tech Stack)

- **Core**: [Electron](https://www.electronjs.org/), TypeScript
- **Frontend**: [Vue 3](https://vuejs.org/), [Vite](https://vitejs.dev/), [Element Plus](https://element-plus.org/)
- **Visualization**: [ECharts](https://echarts.apache.org/)
- **Database**: [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- **Network**: Axios, Node.js net/child_process

## 🚀 快速开始 (Getting Started)

### 前置要求
- Node.js (建议 v16+)
- pnpm (推荐包管理器)

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/Cool-Star/asset-pulse.git
cd asset-pulse

# 安装依赖
pnpm install
```

### 开发模式

同时启动 Vite 前端服务和 Electron 主进程，支持热重载：

```bash
pnpm dev
```

### 构建打包

构建生产环境安装包（产物位于 `release` 目录）：

```bash
# 构建 macOS 应用 (DMG)
pnpm build:mac

# 构建 Windows 应用 (NSIS)
pnpm build:win
```

## 📖 使用指南 (Usage Guide)

1.  **配置 API**：首次启动后，前往“设置”页面配置您的 FOFA Email 和 API Key。
2.  **导入资产**：在仪表盘点击“导入 FOFA 资产”，输入查询语句（例如 `domain="example.com"`）。
3.  **开始监控**：点击右上角的“开始探活”按钮，程序将在后台循环检测资产状态。
4.  **查看报告**：随时可以通过顶部菜单导出当前的存活趋势报告或原始数据。

## 🤝 贡献 (Contributing)

欢迎提交 Issue 和 Pull Request！如果您有好的想法或建议，请随时分享。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证 (License)

本项目基于 [MIT 许可证](LICENSE) 开源。

---

Made with ❤️ by AssetPulse Team