<template>
  <el-container class="app">
    <el-header class="app-header">
      <div class="header-content">
        <div class="nav-brand">
          <div class="brand-logo"><Logo /></div>
          <h1>AssetPulse</h1>
        </div>
        <!-- 可以在这里保留一个空的菜单或者移除 -->
        <el-menu
          :default-active="$route.path"
          mode="horizontal"
          class="nav-menu"
          router
          :ellipsis="false"
        >
          <el-menu-item index="/">
            <el-icon><PieChart /></el-icon>
            <span>仪表盘</span>
          </el-menu-item>
          <el-menu-item index="/assets">
            <el-icon><Monitor /></el-icon>
            <span>资产列表</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- Global Progress Bar -->
      <div
        v-if="probeProgress.total > 0 && isProbing"
        class="global-progress-container"
      >
        <el-progress
          :percentage="
            Math.floor((probeProgress.current / probeProgress.total) * 100)
          "
          :show-text="false"
          :stroke-width="2"
          status="success"
          class="global-progress"
        />
      </div>
    </el-header>

    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { PieChart, Monitor, Setting } from "@element-plus/icons-vue";
import { debounce } from "lodash-es";
import Logo from "./components/Logo.vue";

const probeProgress = ref({ current: 0, total: 0, alive: 0 });
const isProbing = ref(false);
let removeProgressListener: (() => void) | null = null;
let removeStatusListener: (() => void) | null = null;

const updateProgress = debounce((data: any) => {
  probeProgress.value = data;
}, 50);
onMounted(() => {
  // Listen for progress
  removeProgressListener = (window as any).electron.receive(
    "probe:progress",
    (data: any) => {
      // 不重要的更新，可以延后更新
      updateProgress(data);
      if (data.current >= data.total) {
        // Keep it for a moment or reset?
      }
    }
  );

  // Listen for status
  removeStatusListener = (window as any).electron.receive(
    "probe:status",
    (status: boolean) => {
      isProbing.value = status;
      if (!status) {
        // Reset progress when stopped?
        // probeProgress.value = { current: 0, total: 0, alive: 0 };
      }
    }
  );

  // Check initial status
  (window as any).electron.invoke("probe:status").then((status: any) => {
    isProbing.value = status.isProbing;
    if (status.progress) {
      probeProgress.value = status.progress;
    }
  });
});

onUnmounted(() => {
  if (removeProgressListener) removeProgressListener();
  if (removeStatusListener) removeStatusListener();
});
</script>

<style scoped>
.app {
  height: 100vh;
  background: var(--cyber-bg);
  background-image: radial-gradient(
      circle at 15% 50%,
      rgba(0, 243, 255, 0.05) 0%,
      transparent 25%
    ),
    radial-gradient(
      circle at 85% 30%,
      rgba(112, 0, 255, 0.05) 0%,
      transparent 25%
    );
}

.app-header {
  background: rgba(5, 5, 8, 0.8);
  border-bottom: 1px solid var(--cyber-border);
  padding: 0;
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.global-progress-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: transparent;
  padding: 0;
  z-index: 101;
}

.global-progress {
  width: 100%;
  margin: 0;
  line-height: 0;
}

:deep(.el-progress-bar__outer) {
  background-color: transparent !important;
  height: 2px !important;
}

:deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%) !important;
  box-shadow: 0 0 10px rgba(0, 242, 254, 0.5);
  border-radius: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-brand h1 {
  margin: 0;
  color: var(--cyber-text-main);
  font-size: 1.5em;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  background: linear-gradient(90deg, #fff, var(--cyber-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-menu {
  border-bottom: none;
  background: transparent;
}

.nav-menu .el-menu-item {
  height: 60px;
  line-height: 60px;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
  color: var(--cyber-text-sub);
  font-weight: 500;
}

.nav-menu .el-menu-item:hover {
  background: rgba(0, 243, 255, 0.05);
  color: var(--cyber-primary);
}

.nav-menu .el-menu-item.is-active {
  color: var(--cyber-primary);
  border-bottom-color: var(--cyber-primary);
  background: rgba(0, 243, 255, 0.08);
  box-shadow: 0 -10px 20px -10px rgba(0, 243, 255, 0.3) inset;
}

.app-main {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Global Notification Styles */
:global(.el-message) {
  background: #1a1a2e !important;
  border: 1px solid #333 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
}

:global(.el-message__content) {
  color: #e0e0e0 !important;
  font-weight: 500;
}

:global(.el-message--success) {
  border-color: rgba(103, 194, 58, 0.3) !important;
  background: rgba(103, 194, 58, 0.1) !important;
}

:global(.el-message--success .el-message__content) {
  color: #67c23a !important;
}

:global(.el-message--warning) {
  border-color: rgba(230, 162, 60, 0.3) !important;
  background: rgba(230, 162, 60, 0.1) !important;
}

:global(.el-message--warning .el-message__content) {
  color: #e6a23c !important;
}

:global(.el-message--error) {
  border-color: rgba(245, 108, 108, 0.3) !important;
  background: rgba(245, 108, 108, 0.1) !important;
}

:global(.el-message--error .el-message__content) {
  color: #f56c6c !important;
}

:global(.el-message--info) {
  border-color: rgba(144, 147, 153, 0.3) !important;
  background: rgba(144, 147, 153, 0.1) !important;
}

:global(.el-message--info .el-message__content) {
  color: #909399 !important;
}
</style>
