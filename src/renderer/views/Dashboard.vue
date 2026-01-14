<template>
  <div class="dashboard">
    <!-- Action Bar -->
    <div class="action-bar mb-4">
      <div class="left-actions">
        <el-button
          type="primary"
          @click="openImportDialog"
          :icon="Download"
          class="cyber-button"
        >
          导入 Fofa 资产
        </el-button>
        <el-dropdown
          split-button
          type="primary"
          class="cyber-button"
          style="margin-left: 12px; margin-right: 12px"
          @click="handleExport('html')"
        >
          <span style="display: flex; align-items: center">
            <el-icon class="el-icon--left"><Document /></el-icon>
            导出报告
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleExport('excel')"
                >导出 Excel (CSV)</el-dropdown-item
              >
              <el-dropdown-item @click="handleExport('html')"
                >导出 HTML 报告</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          v-if="!isProbing"
          type="success"
          @click="startProbe"
          :icon="VideoPlay"
          :loading="probingLoading"
          class="cyber-button"
        >
          开始探活
        </el-button>
        <el-button
          v-else
          type="danger"
          @click="stopProbe"
          :icon="VideoPause"
          :loading="probingLoading"
          class="cyber-button"
        >
          停止探活
        </el-button>
      </div>
    </div>

    <!-- Configuration Alert -->
    <el-alert
      v-if="!hasKey"
      title="未配置 Fofa Key"
      type="warning"
      description="您需要先配置 Fofa Key 才能使用数据导入功能。"
      show-icon
      class="mb-4"
    >
      <template #default>
        <div>
          您需要先配置 Fofa Key 才能使用数据导入功能。
          <el-button link type="primary" @click="$router.push('/settings')"
            >前往配置</el-button
          >
        </div>
      </template>
    </el-alert>

    <!-- Stats & ECG Row -->
    <el-row
      :gutter="20"
      class="mb-4"
      style="display: flex; align-items: stretch"
    >
      <!-- ECG Chart -->
      <el-col :span="24" style="display: flex; flex-direction: column">
        <el-card
          class="chart-card"
          shadow="never"
          style="flex: 1; display: flex; flex-direction: column"
          :body-style="{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '10px 20px',
          }"
        >
          <div
            ref="ecgChartRef"
            style="width: 100%; flex: 1; min-height: 120px"
          ></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Trend Analysis Row -->
    <el-row class="mb-4">
      <el-col :span="24">
        <el-card
          class="chart-card"
          shadow="never"
          :body-style="{ padding: '10px 20px' }"
        >
          <div ref="lineChartRef" style="width: 100%; height: 350px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Regional Distribution & Details Row -->
    <el-row :gutter="20" class="mb-4">
      <!-- Region Chart -->
      <el-col :span="8">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="header-title">地区资产分布</span>
              <el-button link type="primary" size="small" @click="fetchStats"
                >刷新</el-button
              >
            </div>
          </template>
          <div ref="chartRef" style="width: 100%; height: 400px"></div>
        </el-card>
      </el-col>

      <!-- Region Details -->
      <el-col :span="16">
        <el-card shadow="never" class="regional-card-inner">
          <template #header>
            <div class="card-header">
              <span class="header-title">地区详情监控</span>
            </div>
          </template>
          <el-row :gutter="10">
            <el-col
              :span="8"
              v-for="item in stats"
              :key="item.region"
              class="mb-2"
            >
              <el-card shadow="hover" class="region-item-card">
                <div class="region-header">
                  <span class="region-name" :title="item.region">{{
                    item.region
                  }}</span>
                  <el-tag
                    size="small"
                    :type="item.alive_count > 0 ? 'success' : 'danger'"
                  >
                    {{ item.alive_count > 0 ? "Online" : "Offline" }}
                  </el-tag>
                </div>
                <div class="region-stats">
                  <div class="r-stat">
                    <span class="label">总数</span>
                    <span class="num">{{ item.count }}</span>
                  </div>
                  <div class="r-divider"></div>
                  <div class="r-stat">
                    <span class="label">存活</span>
                    <span class="num alive">{{ item.alive_count }}</span>
                  </div>
                </div>
                <el-progress
                  :percentage="
                    item.count > 0
                      ? Math.round((item.alive_count / item.count) * 100)
                      : 0
                  "
                  :status="item.alive_count > 0 ? 'success' : 'exception'"
                  :stroke-width="6"
                  class="mt-2"
                />
              </el-card>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <!-- Import Dialog -->
    <el-dialog
      v-model="showImportDialog"
      title="导入 Fofa 资产"
      width="500px"
      class="cyber-dialog"
    >
      <el-form :model="importForm" label-width="80px">
        <el-form-item label="查询语句">
          <el-input
            v-model="importForm.query"
            placeholder='例如: port="80"'
            type="textarea"
            :rows="3"
          ></el-input>
        </el-form-item>
        <el-form-item label="数量限制">
          <el-input-number
            v-model="importForm.size"
            :min="10"
            :max="10000"
          ></el-input-number>
        </el-form-item>
        <el-form-item label="过滤选项">
          <el-checkbox v-model="importForm.onlyAlive">
            仅导入存活资产 (将自动进行一次探活)
          </el-checkbox>
        </el-form-item>
        <div v-if="importing" class="import-progress-container mt-2">
          <div class="progress-info mb-1">
            <span v-if="importProgress.stage === 'fetching'">
              <el-icon class="is-loading mr-1"><Loading /></el-icon>
              正在从 Fofa 获取数据...
            </span>
            <span v-else-if="importProgress.stage === 'processing'">
              <el-icon class="is-loading mr-1"><Loading /></el-icon>
              正在处理数据 ({{ importProgress.total }} 条)...
            </span>
            <span v-else-if="importProgress.stage === 'probing'">
              <el-icon class="is-loading mr-1"><Loading /></el-icon>
              正在探活验证: {{ importProgress.current }} /
              {{ importProgress.total }}
            </span>
            <span v-else-if="importProgress.stage === 'saving'">
              <el-icon class="is-loading mr-1"><Loading /></el-icon>
              正在保存数据: {{ importProgress.current }} /
              {{ importProgress.total }}
            </span>
            <span v-else>正在初始化...</span>
          </div>
          <el-progress
            v-if="
              importProgress.total > 0 && importProgress.stage !== 'fetching'
            "
            :percentage="
              Math.min(
                100,
                Math.round(
                  (importProgress.current / importProgress.total) * 100
                )
              )
            "
            :status="importProgress.stage === 'probing' ? 'warning' : 'success'"
            :stroke-width="15"
            striped
            striped-flow
          />
        </div>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showImportDialog = false">取消</el-button>
          <el-button type="primary" @click="handleImport" :loading="importing">
            {{ importing ? "正在导入中..." : "开始导入" }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from "vue";
import * as echarts from "echarts";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Download,
  VideoPlay,
  VideoPause,
  Loading,
  Document,
} from "@element-plus/icons-vue";

const router = useRouter();
const chartRef = ref<HTMLElement | null>(null);
const lineChartRef = ref<HTMLElement | null>(null);
const ecgChartRef = ref<HTMLElement | null>(null);
const stats = ref<any[]>([]);
const globalStats = ref({ total: 0, alive: 0, rate: "0.00" });
const history = ref<any[]>([]);
const hasKey = ref(false);

// Probe State
const isProbing = ref(false);
const probingLoading = ref(false);

// Import State
const showImportDialog = ref(false);
const importing = ref(false);
const importForm = ref({
  query: "",
  size: 100,
  onlyAlive: false,
});

// ECG Data
const ecgData = ref<any[]>([]);
const MAX_ECG_POINTS = 50;

const importProgress = ref({
  stage: "",
  current: 0,
  total: 0,
});

let removeProgressListener: (() => void) | null = null;
let removeImportProgressListener: (() => void) | null = null;
let removeStatusListener: (() => void) | null = null;
let removeRoundCompleteListener: (() => void) | null = null;
let removeAssetUpdateListener: (() => void) | null = null;

const checkKey = async () => {
  const key = await (window as any).electron.invoke("config:get", "fofaKey");
  hasKey.value = !!key;
};

const checkProbeStatus = async () => {
  isProbing.value = await (window as any).electron.invoke("probe:is-running");
};

const fetchStats = async () => {
  try {
    const allRegions = await (window as any).electron.invoke(
      "assets:by-region"
    );
    // Sort by count desc and take top 5
    stats.value = allRegions
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    // Calculate global stats from ALL regions
    let total = 0;
    let alive = 0;
    allRegions.forEach((s: any) => {
      total += s.count;
      alive += s.alive_count;
    });
    globalStats.value = {
      total,
      alive,
      rate: total > 0 ? ((alive / total) * 100).toFixed(2) : "0.00",
    };

    updateChart();

    history.value = await (window as any).electron.invoke("history:get");
    updateLineChart();
  } catch (error) {
    console.error(error);
  }
};

const updateChart = () => {
  if (!chartRef.value) return;
  const myChart =
    echarts.getInstanceByDom(chartRef.value) || echarts.init(chartRef.value);

  const data = stats.value.map((s) => ({
    name: s.region,
    value: s.count,
  }));

  const option = {
    backgroundColor: "transparent",
    title: {
      text: "地区资产分布",
      left: "center",
      textStyle: { color: "#fff" },
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(20, 20, 35, 0.9)",
      borderColor: "#00f3ff",
      textStyle: { color: "#fff" },
    },
    legend: {
      orient: "vertical",
      left: "left",
      textStyle: { color: "#a0a0b0" },
    },
    series: [
      {
        name: "资产数量",
        type: "pie",
        radius: ["40%", "70%"],
        itemStyle: {
          borderRadius: 5,
          borderColor: "#000",
          borderWidth: 2,
        },
        label: {
          color: "#fff",
        },
        data: data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };

  myChart.setOption(option);
};

const updateLineChart = () => {
  if (!lineChartRef.value) return;
  const myChart =
    echarts.getInstanceByDom(lineChartRef.value) ||
    echarts.init(lineChartRef.value, null, { renderer: "svg" });

  const data = history.value || [];
  const dates = data.map((h) => new Date(h.timestamp).toLocaleTimeString());
  const aliveCounts = data.map((h) => h.alive_count);
  const totalCounts = data.map((h) => h.total_count);

  const option = {
    backgroundColor: "transparent",
    // title: {
    //   text: "存活数量变化趋势",
    //   left: "center",
    //   textStyle: { color: "#fff" },
    // },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(20, 20, 35, 0.9)",
      borderColor: "#00f3ff",
      textStyle: { color: "#fff" },
    },
    toolbox: {
      feature: {
        saveAsImage: {
          show: true,
          title: "导出图片",
          name: `AssetPulse_Trend_${Date.now()}`,
          pixelRatio: 2,
          iconStyle: {
            borderColor: "#a0a0b0",
          },
        },
      },
      top: 0,
      right: 20,
    },
    legend: {
      data: ["存活数", "总数"],
      bottom: 0,
      textStyle: { color: "#a0a0b0" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "10%",
      top: "10%",
      containLabel: true,
      borderColor: "#333",
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: "#555" } },
      axisLabel: { color: "#a0a0b0" },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: "#333" } },
      axisLabel: { color: "#a0a0b0" },
    },
    series: [
      {
        name: "存活数",
        data: aliveCounts,
        type: "line",
        smooth: true,
        showSymbol: false,
        itemStyle: { color: "#0afff0" },
        lineStyle: {
          width: 3,
          shadowColor: "rgba(10, 255, 240, 0.5)",
          shadowBlur: 10,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(10, 255, 240, 0.3)" },
            { offset: 1, color: "rgba(10, 255, 240, 0.05)" },
          ]),
        },
      },
      {
        name: "总数",
        data: totalCounts,
        type: "line",
        smooth: true,
        showSymbol: false,
        itemStyle: { color: "#00f3ff" },
        lineStyle: { width: 1, type: "dashed", opacity: 0.5 },
      },
    ],
  };

  myChart.setOption(option);
};

const initEcgChart = () => {
  if (!ecgChartRef.value) return;
  const myChart = echarts.init(ecgChartRef.value);

  // Initial empty data
  for (let i = 0; i < MAX_ECG_POINTS; i++) {
    ecgData.value.push({
      name: i.toString(),
      value: [new Date().getTime() - (MAX_ECG_POINTS - i) * 1000, 0],
    });
  }

  const option = {
    backgroundColor: "transparent",
    grid: {
      left: 10,
      right: 10,
      top: 10,
      bottom: 10,
      containLabel: false,
    },
    xAxis: {
      type: "time",
      splitLine: { show: false },
      axisLine: { show: false },
      axisLabel: { show: false },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 1.2,
      splitLine: { show: false },
      axisLine: { show: false },
      axisLabel: { show: false },
    },
    series: [
      {
        name: "Probe Status",
        type: "line",
        step: "start",
        showSymbol: false,
        hoverAnimation: false,
        data: ecgData.value,
        lineStyle: {
          color: "#0f0",
          width: 2,
          shadowBlur: 5,
          shadowColor: "#0f0",
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(0, 255, 0, 0.3)" },
            { offset: 1, color: "rgba(0, 255, 0, 0.0)" },
          ]),
        },
      },
    ],
  };

  myChart.setOption(option);
};

const updateEcgChart = () => {
  if (!ecgChartRef.value) return;
  const myChart = echarts.getInstanceByDom(ecgChartRef.value);
  if (!myChart) return;

  myChart.setOption({
    series: [
      {
        data: ecgData.value,
      },
    ],
  });
};

// Actions
const openImportDialog = () => {
  if (!hasKey.value) {
    ElMessageBox.confirm(
      "检测到您尚未配置 Fofa Key，无法使用导入功能。是否前往配置？",
      "提示",
      {
        confirmButtonText: "前往配置",
        cancelButtonText: "取消",
        type: "warning",
      }
    )
      .then(() => {
        router.push("/settings");
      })
      .catch(() => {});
    return;
  }
  showImportDialog.value = true;
};

const handleImport = async () => {
  if (!importForm.value.query) return;
  importing.value = true;
  importProgress.value = { stage: "starting", current: 0, total: 0 };
  try {
    await (window as any).electron.invoke("assets:clear");
    const result = await (window as any).electron.invoke(
      "fofa:search",
      importForm.value.query,
      importForm.value.size,
      importForm.value.onlyAlive
    );
    ElMessage.success(result.message);
    showImportDialog.value = false;
    await fetchStats();
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    importing.value = false;
  }
};

const handleExport = async (type: string) => {
  try {
    const result = await (window as any).electron.invoke("report:export", type);
    if (result.success) {
      ElMessage.success(result.message);
    } else if (result.message !== "已取消导出") {
      ElMessage.warning(result.message);
    }
  } catch (error: any) {
    ElMessage.error("导出出错");
  }
};

const startProbe = async () => {
  probingLoading.value = true;
  try {
    await (window as any).electron.invoke("probe:start");
    isProbing.value = true;
    ElMessage.success("已开始后台探活");
  } catch (error: any) {
    console.error(error);
    const msg = error.message || "启动失败";
    // Clean up Electron error prefix if present
    const cleanMsg = msg.replace(/^Error invoking remote method '[^']+': Error: /, "");
    ElMessage.error(cleanMsg);
  } finally {
    probingLoading.value = false;
  }
};

const stopProbe = async () => {
  probingLoading.value = true;
  try {
    await (window as any).electron.invoke("probe:stop");
    isProbing.value = false;
    ElMessage.info("探活已停止");
  } catch (error) {
    ElMessage.error("停止失败");
  } finally {
    probingLoading.value = false;
  }
};

onMounted(async () => {
  await checkKey();
  await checkProbeStatus();
  fetchStats();
  initEcgChart();

  // Listen for progress
  removeProgressListener = (window as any).electron.receive(
    "probe:progress",
    (data: any) => {
      globalStats.value = {
        total: data.total,
        alive: data.alive,
        rate:
          data.total > 0
            ? ((data.alive / data.total) * 100).toFixed(2)
            : "0.00",
      };
    }
  );

  // Listen for import progress
  removeImportProgressListener = (window as any).electron.receive(
    "import:progress",
    (data: any) => {
      importProgress.value = data;
    }
  );

  // Listen for status change
  removeStatusListener = (window as any).electron.receive(
    "probe:status",
    (probing: boolean) => {
      isProbing.value = probing;
      if (!probing) {
        fetchStats();
      }
    }
  );

  // Listen for round complete
  removeRoundCompleteListener = (window as any).electron.receive(
    "probe:round-complete",
    () => {
      fetchStats();
    }
  );

  // Listen for asset update (ECG)
  removeAssetUpdateListener = (window as any).electron.receive(
    "asset:update",
    (asset: any) => {
      const now = new Date();
      const isAlive = asset.status === "alive";
      const value = isAlive ? 1 : 0;

      // Shift out old data
      if (ecgData.value.length >= MAX_ECG_POINTS) {
        ecgData.value.shift();
      }

      ecgData.value.push({
        name: now.toString(),
        value: [now.getTime(), value],
      });

      updateEcgChart();
    }
  );

  window.addEventListener("resize", handleResize);
});

const handleResize = () => {
  if (chartRef.value) echarts.getInstanceByDom(chartRef.value)?.resize();
  if (lineChartRef.value)
    echarts.getInstanceByDom(lineChartRef.value)?.resize();
  if (ecgChartRef.value) echarts.getInstanceByDom(ecgChartRef.value)?.resize();
};

onUnmounted(() => {
  if (removeProgressListener) removeProgressListener();
  if (removeImportProgressListener) removeImportProgressListener();
  if (removeStatusListener) removeStatusListener();
  if (removeRoundCompleteListener) removeRoundCompleteListener();
  if (removeAssetUpdateListener) removeAssetUpdateListener();
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
.dashboard {
  padding: 20px;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.mb-4 {
  margin-bottom: 20px;
}

.mt-2 {
  margin-top: 8px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cyber-button {
  font-weight: bold;
  letter-spacing: 1px;
}

.stat-card-horizontal {
  padding: 0;
  border: none;
  background: var(--cyber-card-bg);
  position: relative;
  overflow: hidden;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-card-horizontal::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--cyber-primary),
    transparent
  );
}

.stat-row {
  display: flex;
  justify-content: space-around;
  align-items: center;
  width: 100%;
  padding: 0 10px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px 0;
}

.stat-divider-vertical {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
}

.regional-card-inner {
  border: none;
  background: transparent;
  margin-bottom: 0;
}

.stat-card {
  text-align: center;
  padding: 20px 0;
  border: none;
  background: var(--cyber-card-bg);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--cyber-primary),
    transparent
  );
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
  font-family: "JetBrains Mono", monospace;
  text-shadow: 0 0 10px rgba(0, 243, 255, 0.3);
}

.stat-value.total {
  color: var(--cyber-primary);
}

.stat-value.alive {
  color: var(--cyber-success);
  text-shadow: 0 0 10px rgba(10, 255, 240, 0.3);
}

.stat-value.rate {
  color: var(--cyber-warning);
  text-shadow: 0 0 10px rgba(255, 204, 0, 0.3);
}

.stat-label {
  color: var(--cyber-text-sub);
  font-size: 14px;
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.chart-card {
  border: none;
  margin-bottom: 0;
  background: transparent;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--cyber-text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title::before {
  content: "";
  display: block;
  width: 4px;
  height: 16px;
  background: var(--cyber-primary);
  border-radius: 2px;
  box-shadow: 0 0 8px var(--cyber-primary);
}

.regional-card {
  margin-top: 20px;
}

.region-item-card {
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.03);
  background-image: linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.2) 25%,
      transparent 25%,
      transparent 50%,
      rgba(0, 0, 0, 0.2) 50%,
      rgba(0, 0, 0, 0.2) 75%,
      transparent 75%,
      transparent
    ),
    linear-gradient(
      45deg,
      rgba(0, 0, 0, 0.2) 25%,
      transparent 25%,
      transparent 50%,
      rgba(0, 0, 0, 0.2) 50%,
      rgba(0, 0, 0, 0.2) 75%,
      transparent 75%,
      transparent
    );
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.region-item-card:hover {
  transform: translateY(-5px);
  background-color: rgba(255, 255, 255, 0.05);
  border-color: var(--cyber-primary);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.region-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  width: 100%;
}

.region-name {
  font-weight: bold;
  font-size: 16px;
  color: var(--cyber-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
  display: inline-block;
}

.region-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-family: "JetBrains Mono", monospace;
}

.r-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.r-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
}

.r-stat .label {
  font-size: 12px;
  color: var(--cyber-text-sub);
  margin-bottom: 4px;
}

.r-stat .num {
  font-size: 18px;
  font-weight: bold;
  color: var(--cyber-text-main);
}

.r-stat .num.alive {
  color: var(--cyber-success);
}
</style>
