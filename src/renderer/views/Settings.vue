<template>
  <div class="settings-view">
    <div class="settings-container">
      <!-- API Configuration -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">API 配置</h2>
          <p class="section-desc">配置 Fofa API 密钥以启用资产发现功能</p>
        </div>
        <el-card shadow="hover" class="settings-card">
          <el-form label-position="top">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="Fofa 邮箱">
                  <el-input
                    v-model="config.fofaEmail"
                    placeholder="your@email.com"
                    prefix-icon="Message"
                  ></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Fofa Key">
                  <el-input
                    v-model="config.fofaKey"
                    type="password"
                    show-password
                    placeholder="Fofa API Key"
                    prefix-icon="Key"
                  ></el-input>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </div>

      <!-- Network Configuration -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">网络配置</h2>
          <p class="section-desc">配置网络代理以解决 API 连接问题</p>
        </div>
        <el-card shadow="hover" class="settings-card">
          <el-form label-position="top">
            <el-form-item label="启用代理" class="mb-2">
              <div class="flex-between">
                <span class="text-sm text-gray"
                  >开启后 Fofa API 请求将通过代理发送</span
                >
                <el-switch v-model="config.proxyEnabled" />
              </div>
            </el-form-item>
            <el-form-item label="代理地址">
              <div class="proxy-input-group">
                <el-input
                  v-model="config.proxy"
                  placeholder="http://127.0.0.1:7890"
                  :disabled="!config.proxyEnabled"
                  prefix-icon="Connection"
                ></el-input>
                <el-button
                  type="primary"
                  plain
                  @click="testProxy"
                  :loading="testingProxy"
                  :disabled="!config.proxyEnabled || !config.proxy"
                >
                  测试连接
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-card>
      </div>

      <!-- Probe Configuration -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">探活配置</h2>
          <p class="section-desc">调整资产存活探测的频率和性能参数</p>
        </div>
        <el-card shadow="hover" class="settings-card">
          <el-form label-position="top">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="探活间隔 (秒)">
                  <el-input-number
                    v-model="config.probeInterval"
                    :min="5"
                    :max="3600"
                    style="width: 100%"
                  />
                  <div class="form-tip">每轮探活结束后等待的时间</div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="并发数量">
                  <el-input-number
                    v-model="config.probeConcurrency"
                    :min="1"
                    :max="1000"
                    :step="10"
                    style="width: 100%"
                  />
                  <div class="form-tip">
                    同时进行的探测任务数 (建议 100-500)
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </div>

      <!-- System Configuration -->
      <div class="settings-section">
        <div class="section-header">
          <h2 class="section-title">系统操作</h2>
          <p class="section-desc">管理应用程序运行状态</p>
        </div>
        <el-card shadow="hover" class="settings-card">
          <div class="flex-between">
            <div class="system-info">
              <span class="info-label">重启应用</span>
              <span class="info-desc">遇到异常或更新配置后可尝试重启</span>
            </div>
            <el-button type="info" @click="restartApp" icon="Refresh">
              立即重启
            </el-button>
          </div>
          <el-divider />
          <div class="flex-between">
            <div class="system-info">
              <span class="info-label">清空数据</span>
              <span class="info-desc"
                >删除所有资产和探测历史记录 (不可恢复)</span
              >
            </div>
            <el-button type="danger" plain @click="clearData" icon="Delete">
              清空数据
            </el-button>
          </div>
        </el-card>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <el-button type="primary" size="large" @click="saveConfig" icon="Check"
          >保存所有配置</el-button
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Message,
  Key,
  Connection,
  Check,
  Refresh,
  Delete,
} from "@element-plus/icons-vue";

const config = ref({
  fofaEmail: "",
  fofaKey: "",
  proxy: "",
  proxyEnabled: false,
  probeInterval: 30,
  probeConcurrency: 200,
});

const testingProxy = ref(false);

const loadConfig = async () => {
  config.value.fofaEmail =
    (await (window as any).electron.invoke("config:get", "fofaEmail")) || "";
  config.value.fofaKey =
    (await (window as any).electron.invoke("config:get", "fofaKey")) || "";
  config.value.proxy =
    (await (window as any).electron.invoke("config:get", "proxy")) || "";

  const proxyEnabled = await (window as any).electron.invoke(
    "config:get",
    "proxyEnabled"
  );
  config.value.proxyEnabled = proxyEnabled === "true";

  const interval = await (window as any).electron.invoke(
    "config:get",
    "probeInterval"
  );
  config.value.probeInterval = interval ? parseInt(interval) : 30;

  const concurrency = await (window as any).electron.invoke(
    "config:get",
    "probeConcurrency"
  );
  config.value.probeConcurrency = concurrency ? parseInt(concurrency) : 200;
};

const saveConfig = async () => {
  await (window as any).electron.invoke(
    "config:set",
    "fofaEmail",
    config.value.fofaEmail
  );
  await (window as any).electron.invoke(
    "config:set",
    "fofaKey",
    config.value.fofaKey
  );
  await (window as any).electron.invoke(
    "config:set",
    "proxy",
    config.value.proxy
  );
  await (window as any).electron.invoke(
    "config:set",
    "proxyEnabled",
    config.value.proxyEnabled.toString()
  );
  await (window as any).electron.invoke(
    "config:set",
    "probeInterval",
    config.value.probeInterval.toString()
  );
  await (window as any).electron.invoke(
    "config:set",
    "probeConcurrency",
    config.value.probeConcurrency.toString()
  );
  ElMessage.success("配置已保存");
};

const testProxy = async () => {
  if (!config.value.proxy) return;
  testingProxy.value = true;
  try {
    const result = await (window as any).electron.invoke(
      "proxy:test",
      config.value.proxy
    );
    if (result.success) {
      ElMessage.success(`代理连接成功 (延迟: ${result.latency}ms)`);
    } else {
      ElMessage.error(`代理连接失败: ${result.error}`);
    }
  } catch (error: any) {
    ElMessage.error(`测试出错: ${error.message}`);
  } finally {
    testingProxy.value = false;
  }
};

const restartApp = async () => {
  try {
    await (window as any).electron.invoke("app:restart");
  } catch (error) {
    ElMessage.error("重启失败，请手动重启");
  }
};

const clearData = async () => {
  try {
    await ElMessageBox.confirm(
      "确定要清空所有资产和历史记录吗？此操作不可恢复。",
      "警告",
      {
        confirmButtonText: "确定清空",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    await (window as any).electron.invoke("assets:clear");
    ElMessage.success("数据已清空");
  } catch (error) {
    if (error !== "cancel") {
      ElMessage.error("清空失败");
    }
  }
};

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.settings-view {
  padding: 20px;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.settings-container {
  max-width: 900px;
  margin: 0 auto;
  padding-bottom: 120px;
}

.settings-section {
  margin-bottom: 30px;
}

.section-header {
  margin-bottom: 15px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--cyber-text-main);
  margin: 0 0 5px 0;
  display: flex;
  align-items: center;
}

.section-title::before {
  content: "";
  display: block;
  width: 4px;
  height: 18px;
  background: var(--cyber-primary);
  margin-right: 10px;
  border-radius: 2px;
  box-shadow: 0 0 8px var(--cyber-primary);
}

.section-desc {
  color: var(--cyber-text-sub);
  font-size: 13px;
  margin: 0;
}

.settings-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.settings-card :deep(.el-card__body) {
  padding: 24px;
}

.proxy-input-group {
  display: flex;
  gap: 10px;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.text-sm {
  font-size: 13px;
}

.text-gray {
  color: var(--cyber-text-sub);
}

.form-tip {
  font-size: 12px;
  color: var(--cyber-text-sub);
  margin-top: 5px;
  line-height: 1.4;
}

.action-bar {
  margin-top: 40px;
  display: flex;
  justify-content: flex-end;
  position: sticky;
  bottom: 20px;
  background: rgba(13, 17, 23, 0.8);
  padding: 15px 20px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.mb-2 {
  margin-bottom: 12px;
}

.system-info {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 14px;
  color: var(--cyber-text-main);
  margin-bottom: 4px;
}

.info-desc {
  font-size: 12px;
  color: var(--cyber-text-sub);
}
</style>
