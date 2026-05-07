<template>
  <!--
    App.vue 是整个应用的顶层认证入口。
    只要本地 Box/Cloud 认证还没有完成，就停留在这个认证面板；
    只有 authState.stage 进入 authenticated 后，才放行到真正的业务路由页面。
  -->
  <main v-if="authState.stage !== 'authenticated'" class="auth-shell">
    <section class="auth-panel">
      <p class="eyebrow">Axion-desktop</p>
      <h1>{{ title }}</h1>
      <p class="description">{{ description }}</p>

      <!--
        二维码区域承载两种不同流程：
        1. 设备尚未绑定时，显示 Cloud 绑定二维码；
        2. 设备已绑定但没有有效会话时，显示 Cloud 登录授权二维码。
        二者共用二维码 UI，但 activeQrUrl 的来源不同。
      -->
      <AuthQrPanel
        v-if="showQrPanel"
        :active-url="activeQrUrl"
        :alt-text="qrAltText"
        :hint="qrHint"
        @refresh="refreshQr"
        @open="openActiveQrUrl"
      />

      <!--
        调试信息默认折叠，避免普通用户被 URL、授权码等细节干扰。
        出问题时展开这里可以看到 Box/Cloud 地址、绑定链接、授权码等关键状态。
      -->
      <details class="debug-details">
        <summary>连接详情</summary>
        <dl class="status-list">
          <div>
            <dt>本地服务</dt>
            <dd>{{ displayBoxBaseUrl }}</dd>
          </div>
          <div>
            <dt>云端服务</dt>
            <dd>{{ authState.cloudBaseUrl }}</dd>
          </div>
          <div v-if="authState.authFlow?.authorize_code">
            <dt>授权码</dt>
            <dd>{{ authState.authFlow.authorize_code }}</dd>
          </div>
          <div v-if="authorizeUrl">
            <dt>授权链接</dt>
            <dd>{{ authorizeUrl }}</dd>
          </div>
          <div v-if="authState.initInfo?.bootstrap_code">
            <dt>启动码</dt>
            <dd>{{ authState.initInfo.bootstrap_code }}</dd>
          </div>
          <div v-if="authState.initInfo?.issue_link">
            <dt>绑定链接</dt>
            <dd>{{ resolveCloudUrl(authState.initInfo.issue_link) }}</dd>
          </div>
        </dl>

        <!--
          如果 Box 已绑定并且启用了本地账号，则保留本地账号登录兜底入口。
          当前主流程更偏向扫码授权，所以这个表单放在 debug details 内。
        -->
        <form v-if="showLocalLogin" class="login-form" @submit.prevent="submitLocalLogin">
          <input v-model.trim="username" autocomplete="username" placeholder="用户名" />
          <input v-model="password" autocomplete="current-password" placeholder="密码" type="password" />
          <button type="submit" :disabled="authState.stage === 'authenticating'">本地登录</button>
        </form>

        <!-- 手动刷新/打开绑定链接主要用于调试、二维码失效或绑定轮询异常时恢复流程。 -->
        <div class="actions">
          <button type="button" @click="authManager.forceRefresh()">刷新状态</button>
          <button v-if="authState.initInfo?.issue_link" type="button" @click="openBindLink">打开绑定链接</button>
        </div>
      </details>

      <p v-if="authState.lastError" class="error-text">{{ authState.lastError }}</p>
    </section>
  </main>
  <RouterView v-else />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import AuthQrPanel from "./components/AuthQrPanel.vue";
import { authManager } from "./services/auth/auth-manager";
import { authState } from "./services/auth/auth-state";

// 本地账号登录表单字段。只有 Box 已绑定且启用 local_account_setup 时才会显示。
const username = ref("");
const password = ref("");

// 防止多个响应式更新同时触发 Cloud 登录流创建，导致重复请求授权二维码。
const creatingCloudFlow = ref(false);

// dev 模式下 runtimeConfig.boxBaseUrl 可能为空，因为请求会通过 Vite proxy 转发。
// UI 上给一个更可读的说明，避免调试时看到空字符串误判为配置缺失。
const displayBoxBaseUrl = computed(() => authState.boxBaseUrl || "Vite 代理 -> http://127.0.0.1:26681");

// 设备未绑定且 Box 返回 issue_link 时，进入“扫码绑定设备”流程。
const showBindingQr = computed(() => authState.initInfo?.bound === false && Boolean(authState.initInfo?.issue_link));

// 设备已绑定后，可以创建 Cloud Web Auth 流，显示扫码登录二维码。
const showCloudLogin = computed(() => authState.initInfo?.bound === true);

// 本地账号登录是备用路径，不是所有 Box 都会开启。
const showLocalLogin = computed(() => authState.initInfo?.bound === true && authState.initInfo.local_account_setup);

// 只要处于绑定或 Cloud 登录任一流程，就显示二维码面板。
const showQrPanel = computed(() => showBindingQr.value || showCloudLogin.value);

// Cloud 登录授权链接来自 authFlow，绑定链接来自 initInfo。
// 后端可能返回相对路径，所以这里统一走 resolveCloudUrl 变成可打开的完整 URL。
const authorizeUrl = computed(() => resolveCloudUrl(authState.authFlow?.authorize_link ?? ""));
const bindUrl = computed(() => resolveCloudUrl(authState.initInfo?.issue_link ?? ""));

// 当前二维码实际编码的 URL：绑定优先，否则使用 Cloud 登录授权链接。
const activeQrUrl = computed(() => (showBindingQr.value ? bindUrl.value : authorizeUrl.value));
const qrAltText = computed(() => (showBindingQr.value ? "设备绑定二维码" : "云端登录二维码"));

// 根据认证阶段生成主标题。这里不直接展示 stage 字符串，是为了让用户看到任务导向的文案。
const title = computed(() => {
  switch (authState.stage) {
    case "checking":
      return "正在检查本地服务";
    case "box_offline":
      return "本地服务离线";
    case "device_unbound":
    case "binding_pending":
      return "扫码绑定设备";
    case "device_reinit_required":
      return "需要重新绑定设备";
    case "session_expired":
      return "登录已过期";
    case "authenticating":
      return "正在准备云端登录";
    default:
      return showCloudLogin.value ? "扫码登录" : "需要登录";
  }
});

// 主描述补充当前阶段用户应该做什么，以及失败时可能的处理方向。
const description = computed(() => {
  if (authState.stage === "device_unbound" || authState.stage === "binding_pending") {
    return "请在云端完成设备绑定，完成后应用会自动继续。";
  }
  if (authState.stage === "device_reinit_required") {
    return "本地服务提示设备绑定已失效，请重新绑定后再登录。";
  }
  if (authState.stage === "box_offline") {
    return "请启动本地服务，或更新已配置的服务地址和端口。";
  }
  if (showCloudLogin.value) {
    return "请用手机扫描二维码，并在云端完成登录授权。";
  }
  return "请登录本地服务以继续。";
});

// 二维码下方的状态提示，比 title/description 更贴近扫码流程本身。
const qrHint = computed(() => {
  if (showBindingQr.value) {
    return "扫描此二维码，在云端绑定这台设备。";
  }
  const status = authState.authFlow?.status;
  if (status === "approved") {
    return "授权已通过，正在完成登录...";
  }
  if (status === "expired") {
    return "二维码已过期，请刷新后继续。";
  }
  if (status === "rejected") {
    return "授权已被拒绝，请刷新后重试。";
  }
  return "正在等待云端授权。";
});

// 本地账号登录兜底：成功后 authManager 会持久化 session，并把 stage 切到 authenticated。
const submitLocalLogin = async () => {
  await authManager.loginWithLocalAccount(username.value, password.value);
};

// 刷新二维码：
// - 绑定二维码本质来自 Box initInfo，刷新 Box 状态即可；
// - 登录二维码来自 Cloud Web Auth，需要重新创建授权流。
const refreshQr = async () => {
  if (showBindingQr.value) {
    await authManager.forceRefresh();
    return;
  }
  await authManager.startCloudLogin({ openWindow: false });
};

// 打开当前二维码对应的链接，用于无法扫码或需要在浏览器中手动验证链接时。
const openActiveQrUrl = () => {
  if (activeQrUrl.value) {
    window.open(activeQrUrl.value, "_blank", "noopener,noreferrer");
  }
};

// 只打开绑定链接。保留独立函数是因为 debug details 里只关心绑定流程。
const openBindLink = () => {
  const link = resolveCloudUrl(authState.initInfo?.issue_link ?? "");
  if (link) {
    window.open(link, "_blank", "noopener,noreferrer");
  }
};

// 自动准备 Cloud 登录二维码。
// 当设备已绑定、当前没有 authorize_link、且没有其他创建请求进行中时才会触发。
// openWindow: false 表示只生成二维码，不自动弹出浏览器授权页。
const prepareCloudLogin = async () => {
  if (!showCloudLogin.value || authState.authFlow?.authorize_link || creatingCloudFlow.value) {
    return;
  }
  creatingCloudFlow.value = true;
  try {
    await authManager.startCloudLogin({ openWindow: false });
  } finally {
    creatingCloudFlow.value = false;
  }
};

// 将 Box/Cloud 返回的相对链接统一转换成完整 Cloud URL。
// 如果后端已经返回 http(s) 绝对地址，则原样使用。
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

// 监听认证阶段、绑定状态和授权链接。
// 进入 login_required/session_expired 且设备已绑定时，自动创建 Cloud 登录二维码，
// 这样用户不需要先点按钮才能看到扫码入口。
watch(
  () => [authState.stage, authState.initInfo?.bound, authState.authFlow?.authorize_link] as const,
  () => {
    if ((authState.stage === "login_required" || authState.stage === "session_expired") && showCloudLogin.value) {
      void prepareCloudLogin();
    }
  },
  { immediate: true },
);

// 应用挂载后启动认证状态机：读取 Box 初始化信息、检查本地 session、启动轮询等。
onMounted(() => {
  void authManager.boot();
});
</script>

<style scoped>
/* 认证态的全屏容器：业务页面未放行前，用户只看到这个居中的登录/绑定面板。 */
.auth-shell {
  width: 100vw;
  height: 100vh;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: clamp(10px, 2.5vh, 24px);
  overflow: hidden;
  color: #dcecf2;
  background: linear-gradient(180deg, #02070c 0%, #06131c 100%);
}

/* 半透明面板保持和主应用暗色科幻视觉一致，同时控制认证页宽度。 */
.auth-panel {
  width: min(460px, 100%);
  max-height: calc(100vh - clamp(20px, 5vh, 48px));
  display: grid;
  overflow-y: auto;
  box-sizing: border-box;
  padding: clamp(16px, 3vh, 24px);
  border: 1px solid rgba(108, 197, 216, 0.36);
  border-radius: 18px;
  background: rgba(6, 24, 33, 0.72);
  scrollbar-width: thin;
}

.eyebrow {
  margin: 0 0 8px;
  color: rgba(104, 231, 244, 0.9);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(22px, 4vh, 28px);
}

.description {
  margin: 8px 0 clamp(10px, 2vh, 18px);
  color: rgba(198, 225, 232, 0.82);
  line-height: 1.5;
  font-size: clamp(13px, 2.2vh, 16px);
}

.debug-details {
  margin-top: clamp(8px, 1.6vh, 14px);
  border-top: 1px solid rgba(108, 197, 216, 0.22);
  padding-top: 10px;
}

.debug-details summary {
  color: rgba(104, 231, 244, 0.9);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.status-list {
  display: grid;
  gap: 8px;
  margin: 10px 0 12px;
  max-height: 150px;
  overflow-y: auto;
}

.status-list div {
  min-width: 0;
}

dt {
  color: rgba(104, 231, 244, 0.8);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

dd {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  color: rgba(228, 247, 251, 0.96);
}

.login-form,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

input,
button {
  height: 38px;
  box-sizing: border-box;
  border: 1px solid rgba(93, 185, 202, 0.36);
  border-radius: 10px;
}

input {
  min-width: 0;
  flex: 1;
  padding: 0 12px;
  color: #e8f8fb;
  background: rgba(2, 12, 18, 0.72);
}

button {
  padding: 0 14px;
  color: rgba(214, 242, 248, 0.95);
  background: rgba(7, 32, 47, 0.86);
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.actions {
  margin-top: 10px;
}

.error-text {
  margin: 14px 0 0;
  color: #ffb4b4;
}

@media (max-height: 640px) {
  .auth-panel {
    width: min(430px, 100%);
    padding: 14px 16px;
  }

  .eyebrow {
    margin-bottom: 5px;
    font-size: 10px;
  }

  .description {
    line-height: 1.35;
  }

  .debug-details {
    font-size: 12px;
  }

  input,
  button {
    height: 34px;
  }
}

@media (max-height: 520px) {
  .auth-shell {
    place-items: center;
    padding: 8px;
  }

  .auth-panel {
    max-height: calc(100vh - 16px);
  }

}

@media (max-height: 520px) and (min-width: 560px) {
  .auth-panel {
    width: min(620px, 100%);
    grid-template-columns: minmax(0, 1fr) minmax(168px, 220px);
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    align-items: start;
    column-gap: 16px;
    row-gap: 6px;
    padding: 12px 14px;
  }

  .eyebrow {
    margin-bottom: 2px;
  }

  h1 {
    font-size: 20px;
    line-height: 1.1;
  }

  .description {
    margin: 0;
    font-size: 12px;
    line-height: 1.3;
  }

  .debug-details {
    margin-top: 4px;
    padding-top: 8px;
  }

  .debug-details summary {
    font-size: 12px;
  }

  .error-text {
    grid-column: 1 / -1;
    margin-top: 4px;
    font-size: 12px;
  }
}
</style>
