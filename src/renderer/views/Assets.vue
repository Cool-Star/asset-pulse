<template>
  <div class="assets-view">
    <div class="toolbar">
      <el-button @click="fetchAssets" icon="Refresh">刷新</el-button>
    </div>

    <div class="table-container">
      <div v-if="assets.length === 0" class="empty-state">
        <el-empty description="暂无资产数据" :image-size="200">
          <template #image>
            <div class="empty-icon-wrapper">
              <el-icon :size="80" class="empty-icon-main"><Monitor /></el-icon>
              <div class="radar-ring ring-1"></div>
              <div class="radar-ring ring-2"></div>
              <div class="radar-line"></div>
            </div>
          </template>
          <template #extra>
            <p class="empty-tip">请前往仪表盘导入资产或添加新的探测任务</p>
          </template>
        </el-empty>
      </div>
      <el-auto-resizer v-else>
        <template #default="{ height, width }">
          <el-table-v2
            :columns="columns as any"
            :data="assets"
            :width="width"
            :height="height"
            fixed
          />
        </template>
      </el-auto-resizer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from "vue";
import { ElTag, ElAutoResizer, ElTableV2 } from "element-plus";
import {
  Refresh,
  Delete,
  Monitor,
  DataLine,
  Aim,
} from "@element-plus/icons-vue";

const assets = ref<any[]>([]);

const getStatusType = (status: string) => {
  if (status === "alive") return "success";
  if (status === "dead") return "danger";
  return "info";
};

const formatTime = (ts: number) => {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
};

const columns = [
  { key: "id", dataKey: "id", title: "ID", width: 80 },
  { key: "host", dataKey: "host", title: "主机", width: 220 },
  { key: "ip", dataKey: "ip", title: "IP", width: 140 },
  { key: "port", dataKey: "port", title: "端口", width: 80 },
  { key: "protocol", dataKey: "protocol", title: "协议", width: 100 },
  { key: "region", dataKey: "region", title: "地区", width: 120 },
  {
    key: "status",
    dataKey: "status",
    title: "状态",
    width: 100,
    cellRenderer: ({ cellData: status }: any) =>
      h(
        ElTag,
        { type: getStatusType(status), effect: "dark" },
        { default: () => status }
      ),
  },
  {
    key: "last_check",
    dataKey: "last_check",
    title: "最后检查时间",
    width: 200,
    cellRenderer: ({ cellData: ts }: any) => formatTime(ts),
  },
];

const fetchAssets = async () => {
  assets.value = await (window as any).electron.invoke("assets:get");
};

const clearAssets = async () => {
  await (window as any).electron.invoke("assets:clear");
  fetchAssets();
};

onMounted(() => {
  fetchAssets();
});
</script>

<style scoped>
.assets-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

.toolbar {
  margin-bottom: 20px;
}

.table-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.empty-tip {
  color: var(--cyber-text-sub);
  font-size: 14px;
  margin-top: 10px;
}
</style>
