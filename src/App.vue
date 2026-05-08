<template>
  <main v-if="authState.stage !== 'authenticated'" class="auth-shell">
    <section class="auth-panel">
      <p class="eyebrow">Axion-desktop</p>
      <h1>{{ title }}</h1>
      <p class="description">{{ description }}</p>

      <AuthQrPanel
        v-if="showBindingQr"
        :active-url="bindUrl"
        alt-text="设备绑定二维码"
        :hint="qrHint"
        :reset-required="shouldResetBinding"
        :refreshing="refreshingBinding"
        @refresh="refreshBindingState"
        @open="openBindLink"
      />

      <section v-else class="binding-state">
        <strong>{{ stateLabel }}</strong>
        <span>{{ stateHint }}</span>
      </section>

      <details class="debug-details">
        <summary>连接详情</summary>
        <dl class="status-list">
          <div>
            <dt>本地服务</dt>
            <dd>{{ displayBoxBaseUrl }}</dd>
          </div>
          <div>
            <dt>桌面配置</dt>
            <dd>{{ desktopConfigPath }}</dd>
          </div>
          <div v-if="authState.initInfo?.bootstrap_code">
            <dt>绑定码</dt>
            <dd>{{ authState.initInfo.bootstrap_code }}</dd>
          </div>
          <div v-if="authState.initInfo?.issue_link">
            <dt>绑定链接</dt>
            <dd>{{ bindUrl }}</dd>
          </div>
          <div v-if="authState.initInfo?.device_id">
            <dt>设备 ID</dt>
            <dd>{{ authState.initInfo.device_id }}</dd>
          </div>
          <div v-if="authState.initInfo?.bind_state">
            <dt>绑定状态</dt>
            <dd>{{ authState.initInfo.bind_state }}</dd>
          </div>
        </dl>

        <div class="actions">
          <button type="button" @click="refreshBindingState">刷新状态</button>
          <button v-if="authState.initInfo?.issue_link" type="button" @click="openBindLink">打开绑定链接</button>
        </div>
      </details>

      <p v-if="authState.lastError" class="error-text">{{ authState.lastError }}</p>
    </section>
  </main>
  <RouterView v-else />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AuthQrPanel from "./components/AuthQrPanel.vue";
import { authManager } from "./services/auth/auth-manager";
import { authState } from "./services/auth/auth-state";

const displayBoxBaseUrl = computed(() => authState.boxBaseUrl || "Vite 代理 -> http://127.0.0.1:26681");
const desktopConfigPath = computed(() => window.runtime?.env.desktopConfigPath || "config.yaml");
const normalizedBindState = computed(() => String(authState.initInfo?.bind_state ?? "").trim().toLowerCase());
const isBootstrapExpired = computed(() => normalizedBindState.value === "bootstrap_expired");
const shouldResetBinding = computed(
  () =>
    isBootstrapExpired.value ||
    normalizedBindState.value === "reinit_required" ||
    authState.initInfo?.needs_reset_binding === true ||
    authState.stage === "device_reinit_required",
);
const showBindingQr = computed(() => !authState.initInfo?.bound && Boolean(authState.initInfo?.issue_link));
const bindUrl = computed(() => resolveCloudUrl(authState.initInfo?.issue_link ?? ""));
const refreshingBinding = ref(false);

const title = computed(() => {
  if (isBootstrapExpired.value) {
    return "绑定码已过期";
  }
  switch (authState.stage) {
    case "checking":
      return "正在检查设备绑定";
    case "box_offline":
      return "本地服务不可用";
    case "device_unbound":
    case "binding_pending":
      return "扫码绑定设备";
    case "device_reinit_required":
      return "需要重新绑定设备";
    case "error":
      return "无法完成绑定检查";
    default:
      return "等待设备绑定";
  }
});

const description = computed(() => {
  if (isBootstrapExpired.value) {
    return "当前 BS code 已经过期，请刷新绑定状态或重新初始化设备后生成新的绑定码。";
  }
  if (authState.stage === "checking") {
    return "正在读取本机令牌并检查 Box 绑定状态。";
  }
  if (authState.stage === "box_offline") {
    return "请确认本机 axion-box 服务已经启动，并且桌面端 config.yaml 中的 static-token 配置正确。";
  }
  if (authState.stage === "device_reinit_required") {
    return "当前设备绑定状态已失效，请重新完成设备绑定。";
  }
  if (authState.stage === "error") {
    return "绑定状态检查失败，请查看连接详情后刷新重试。";
  }
  return "请使用云端绑定入口扫描二维码，完成后应用会自动进入主界面。";
});

const qrHint = computed(() => {
  const code = authState.initInfo?.bootstrap_code;
  return code ? `扫描二维码绑定这台设备，绑定码：${code}` : "扫描二维码绑定这台设备。";
});

const stateLabel = computed(() => {
  if (isBootstrapExpired.value) {
    return "BS code 已过期";
  }
  if (authState.stage === "checking") {
    return "检查中";
  }
  if (authState.stage === "box_offline") {
    return "无法连接本地 Box";
  }
  if (authState.stage === "error") {
    return "检查失败";
  }
  return "等待绑定信息";
});

const stateHint = computed(() => {
  if (isBootstrapExpired.value) {
    return "Box 已识别 cloud 返回的 challenge expired，当前二维码不应继续用于绑定。";
  }
  if (authState.stage === "checking") {
    return "正在读取 static-token 并请求本机服务。";
  }
  if (authState.stage === "box_offline") {
    return "检查 axion-box 服务、端口和桌面端 static-token 配置。";
  }
  if (authState.stage === "error") {
    return "可以刷新状态，或展开连接详情查看当前配置。";
  }
  return "Box 返回绑定链接后会显示二维码。";
});

const refreshBindingState = async () => {
  if (refreshingBinding.value) {
    return;
  }

  refreshingBinding.value = true;
  try {
    if (shouldResetBinding.value) {
      await authManager.resetBinding();
      return;
    }
    await authManager.forceRefresh();
  } finally {
    refreshingBinding.value = false;
  }
};

const openBindLink = () => {
  if (bindUrl.value) {
    window.open(bindUrl.value, "_blank", "noopener,noreferrer");
  }
};

const resolveCloudUrl = (rawUrl: string) => {
  const raw = rawUrl.trim();
  if (!raw) {
    return "";
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return `${authState.cloudBaseUrl.replace(/\/$/, "")}/${raw.replace(/^\//, "")}`;
};

onMounted(() => {
  void authManager.boot();
});
</script>

<style scoped>
.auth-shell {
  width: 100vw;
  height: 100vh;
  min-width: var(--ax-screen-min-width);
  min-height: var(--ax-screen-min-height);
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: var(--ax-page-padding);
  overflow: hidden;
  color: #dcecf2;
  background: linear-gradient(180deg, #02070c 0%, #06131c 100%);
}

.auth-panel {
  width: min(var(--ax-auth-panel-width), 100%);
  max-height: calc(100vh - (var(--ax-page-padding) * 2));
  display: grid;
  overflow-y: auto;
  box-sizing: border-box;
  padding: var(--ax-panel-padding);
  border: 1px solid rgba(108, 197, 216, 0.36);
  border-radius: var(--ax-panel-radius);
  background: rgba(6, 24, 33, 0.72);
  scrollbar-width: thin;
}

.eyebrow {
  margin: 0 0 8px;
  color: rgba(104, 231, 244, 0.9);
  font-size: var(--ax-font-micro);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: var(--ax-font-title);
  line-height: 1.1;
}

.description {
  margin: 8px 0 var(--ax-panel-gap);
  color: rgba(198, 225, 232, 0.82);
  font-size: var(--ax-font-body);
  line-height: var(--ax-line-body);
}

.binding-state {
  display: grid;
  gap: 6px;
  margin: 4px 0 var(--ax-panel-gap);
  padding: var(--ax-panel-padding);
  border: 1px solid rgba(108, 197, 216, 0.28);
  border-radius: var(--ax-card-radius);
  background: rgba(2, 12, 18, 0.45);
}

.binding-state strong {
  color: rgba(228, 247, 251, 0.96);
  font-size: var(--ax-font-section-title);
}

.binding-state span {
  color: rgba(198, 225, 232, 0.82);
  font-size: var(--ax-font-body);
  line-height: var(--ax-line-body);
}

.debug-details {
  margin-top: var(--ax-panel-gap);
  border-top: 1px solid rgba(108, 197, 216, 0.22);
  padding-top: var(--ax-panel-gap);
}

.debug-details summary {
  color: rgba(104, 231, 244, 0.9);
  cursor: pointer;
  font-size: var(--ax-font-caption);
  font-weight: 700;
}

.status-list {
  display: grid;
  gap: var(--ax-panel-gap);
  margin: var(--ax-panel-gap) 0;
  max-height: min(150px, 24vh);
  overflow-y: auto;
}

.status-list div {
  min-width: 0;
}

dt {
  color: rgba(104, 231, 244, 0.8);
  font-size: var(--ax-font-micro);
  font-weight: 700;
  text-transform: uppercase;
}

dd {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  color: rgba(228, 247, 251, 0.96);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ax-panel-gap);
  margin-top: var(--ax-panel-gap);
}

button {
  height: var(--ax-control-height);
  box-sizing: border-box;
  border: 1px solid rgba(93, 185, 202, 0.36);
  border-radius: var(--ax-control-radius);
  padding: 0 14px;
  color: rgba(214, 242, 248, 0.95);
  background: rgba(7, 32, 47, 0.86);
  cursor: pointer;
}

.error-text {
  margin: var(--ax-panel-gap) 0 0;
  color: #ffb4b4;
  font-size: var(--ax-font-body);
}

@media (max-height: 520px) and (min-width: 560px) {
  .auth-panel {
    width: min(var(--ax-auth-panel-width), 100%);
    grid-template-columns: minmax(0, 1fr) minmax(168px, 220px);
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    align-items: start;
    column-gap: var(--ax-page-gap);
    row-gap: var(--ax-panel-gap);
  }

  .description {
    margin: 0;
    line-height: 1.3;
  }

  .binding-state {
    grid-column: 1 / -1;
  }

  .error-text {
    grid-column: 1 / -1;
    margin-top: 4px;
  }
}
</style>
