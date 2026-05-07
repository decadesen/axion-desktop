<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  conversationDisplayMode,
  conversationDisplayModeOptions,
} from "../features/glenclaw-home/preferences";
import type { ConversationDisplayMode } from "../features/glenclaw-home/types";
import {
  deviceApi,
  type AudioStatus,
  type DeviceCapabilities,
  type DeviceStatus,
  type DisplayStatus,
  type NetworkStatus,
  type StorageDevice,
  type USBDevice,
  type WiFiAccessPoint,
} from "../services/device-api";

type SettingsSectionKey = "overview" | "network" | "storage" | "display" | "audio" | "home";

type SettingsSection = {
  key: SettingsSectionKey;
  title: string;
  subtitle: string;
};

const router = useRouter();
const activeSectionKey = ref<SettingsSectionKey>("overview");
const loading = ref(false);
const actionMessage = ref("");
const actionError = ref("");

const deviceStatus = ref<DeviceStatus | null>(null);
const capabilities = ref<DeviceCapabilities | null>(null);
const networkStatus = ref<NetworkStatus | null>(null);
const wifiList = ref<WiFiAccessPoint[]>([]);
const selectedSSID = ref("");
const manualSSID = ref("");
const wifiPassword = ref("");
const rememberWiFi = ref(true);
const hiddenWiFi = ref(false);
const wifiDialogOpen = ref(false);
const pendingAccessPoint = ref<WiFiAccessPoint | null>(null);
const wifiInputMode = ref<"ssid" | "password">("password");
const keyboardShift = ref(false);
const usbDevices = ref<USBDevice[]>([]);
const storageDevices = ref<StorageDevice[]>([]);
const displayStatus = ref<DisplayStatus | null>(null);
const brightnessPercent = ref(50);
const audioStatus = ref<AudioStatus | null>(null);
const volumePercent = ref(50);
const localScreenSize = {
  widthCm: 16.4,
  heightCm: 10,
};
const localScreenSizeLabel = `${localScreenSize.widthCm} × ${localScreenSize.heightCm} cm`;
const localScreenAspectRatio = (localScreenSize.widthCm / localScreenSize.heightCm).toFixed(2);

const sections: SettingsSection[] = [
  { key: "overview", title: "设备概览", subtitle: "Agent 状态与能力" },
  { key: "network", title: "网络", subtitle: "Wi-Fi 扫描、连接、断开" },
  { key: "storage", title: "外设与存储", subtitle: "USB、挂载、卸载、弹出" },
  { key: "display", title: "显示", subtitle: "屏幕亮度控制" },
  { key: "audio", title: "声音", subtitle: "音量与静音控制" },
  { key: "home", title: "首页显示", subtitle: "右侧对话列表样式" },
];

const activeSection = computed(
  () => sections.find((section) => section.key === activeSectionKey.value) ?? sections[0],
);

const selectedAccessPoint = computed(
  () => wifiList.value.find((item) => item.ssid === selectedSSID.value) ?? null,
);

const currentWiFiSSID = computed(() => {
  const status = networkStatus.value as
    | (NetworkStatus & {
        ssid?: string;
        wifiSsid?: string;
        currentSsid?: string;
        connectedSsid?: string;
      })
    | null;

  return (
    status?.wifiSsid ||
    status?.connectedSsid ||
    status?.currentSsid ||
    status?.ssid ||
    status?.primary ||
    ""
  ).trim();
});

const currentAccessPoint = computed(
  () => wifiList.value.find((item) => item.ssid && item.ssid === currentWiFiSSID.value) ?? null,
);

const pendingSSID = computed(() => {
  if (pendingAccessPoint.value) {
    return pendingAccessPoint.value.ssid.trim();
  }
  return manualSSID.value.trim();
});

const keyboardRows = computed(() => {
  const letterRows = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m"],
  ];
  const letters = keyboardShift.value
    ? letterRows.map((row) => row.map((key) => key.toUpperCase()))
    : letterRows;

  return [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ...letters,
    ["-", "_", "@", ".", "#", "!", "?", " "],
  ];
});

const isSecuredWiFi = (security = "") => {
  const normalized = security.trim().toLowerCase();
  return !["", "open", "none", "no", "--"].includes(normalized);
};

const formatSecurity = (security = "") => (isSecuredWiFi(security) ? security : "开放");

const isCurrentAccessPoint = (ap: WiFiAccessPoint) => Boolean(ap.ssid && ap.ssid === currentWiFiSSID.value);

const setConversationDisplayMode = (mode: ConversationDisplayMode) => {
  conversationDisplayMode.value = mode;
};

const withAction = async (label: string, task: () => Promise<void>) => {
  loading.value = true;
  actionMessage.value = "";
  actionError.value = "";
  try {
    await task();
    actionMessage.value = label;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
};

const refreshOverview = async () => {
  const [status, caps] = await Promise.all([deviceApi.status(), deviceApi.capabilities()]);
  deviceStatus.value = status;
  capabilities.value = caps;
};

const refreshNetwork = async () => {
  const [status, aps] = await Promise.all([deviceApi.networkStatus(), deviceApi.scanWiFi()]);
  networkStatus.value = status;
  wifiList.value = aps;
  if (!selectedSSID.value && aps[0]?.ssid) {
    selectedSSID.value = aps[0].ssid;
  }
};

const refreshStorage = async () => {
  const [usb, storage] = await Promise.all([deviceApi.listUSB(), deviceApi.listStorage()]);
  usbDevices.value = usb;
  storageDevices.value = storage;
};

const refreshDisplay = async () => {
  const status = await deviceApi.displayStatus();
  displayStatus.value = status;
  brightnessPercent.value = status.percent;
};

const refreshAudio = async () => {
  const status = await deviceApi.audioStatus();
  audioStatus.value = status;
  volumePercent.value = status.percent;
};

const refreshActiveSection = async () => {
  await withAction("已刷新设备状态", async () => {
    if (activeSectionKey.value === "overview") {
      await refreshOverview();
    } else if (activeSectionKey.value === "network") {
      await refreshNetwork();
    } else if (activeSectionKey.value === "storage") {
      await refreshStorage();
    } else if (activeSectionKey.value === "display") {
      await refreshDisplay();
    } else if (activeSectionKey.value === "audio") {
      await refreshAudio();
    }
  });
};

const refreshAll = async () => {
  await withAction("已加载全部设备能力", async () => {
    await Promise.allSettled([
      refreshOverview(),
      refreshNetwork(),
      refreshStorage(),
      refreshDisplay(),
      refreshAudio(),
    ]);
  });
};

const connectWiFi = async () => {
  const ssid = pendingSSID.value || selectedSSID.value.trim();
  if (!ssid) {
    actionError.value = "请选择或输入 Wi-Fi SSID";
    return;
  }

  await withAction(`已提交连接 ${ssid}`, async () => {
    await deviceApi.connectWiFi({
      ssid,
      password: wifiPassword.value,
      bssid: pendingAccessPoint.value?.bssid ?? selectedAccessPoint.value?.bssid,
      hidden: hiddenWiFi.value,
      remember: rememberWiFi.value,
    });
    wifiPassword.value = "";
    wifiDialogOpen.value = false;
    await refreshNetwork();
  });
};

const connectOpenWiFi = async (ap: WiFiAccessPoint) => {
  pendingAccessPoint.value = ap;
  selectedSSID.value = ap.ssid;
  hiddenWiFi.value = false;
  wifiPassword.value = "";
  await connectWiFi();
};

const openWiFiPasswordDialog = (ap: WiFiAccessPoint | null = null) => {
  pendingAccessPoint.value = ap;
  selectedSSID.value = ap?.ssid ?? "";
  manualSSID.value = ap?.ssid ?? "";
  wifiPassword.value = "";
  hiddenWiFi.value = !ap;
  wifiInputMode.value = ap ? "password" : "ssid";
  keyboardShift.value = false;
  wifiDialogOpen.value = true;
};

const chooseAccessPoint = (ap: WiFiAccessPoint) => {
  selectedSSID.value = ap.ssid;
  hiddenWiFi.value = false;
  if (isCurrentAccessPoint(ap)) {
    return;
  }
  if (isSecuredWiFi(ap.security)) {
    openWiFiPasswordDialog(ap);
    return;
  }
  void connectOpenWiFi(ap);
};

const closeWiFiDialog = () => {
  wifiDialogOpen.value = false;
  pendingAccessPoint.value = null;
  wifiPassword.value = "";
};

const appendKeyboardKey = (key: string) => {
  const value = key === " " ? " " : key;
  if (wifiInputMode.value === "ssid") {
    if (manualSSID.value.length < 32) {
      manualSSID.value += value;
    }
    return;
  }
  if (wifiPassword.value.length < 63) {
    wifiPassword.value += value;
  }
};

const backspaceKeyboard = () => {
  if (wifiInputMode.value === "ssid") {
    manualSSID.value = manualSSID.value.slice(0, -1);
    return;
  }
  wifiPassword.value = wifiPassword.value.slice(0, -1);
};

const clearKeyboardValue = () => {
  if (wifiInputMode.value === "ssid") {
    manualSSID.value = "";
    return;
  }
  wifiPassword.value = "";
};

const disconnectWiFi = async () => {
  await withAction("已断开当前 Wi-Fi", async () => {
    await deviceApi.disconnectWiFi();
    await refreshNetwork();
  });
};

const forgetWiFi = async () => {
  const ssid = selectedSSID.value.trim();
  if (!ssid) {
    actionError.value = "请选择要忘记的 Wi-Fi";
    return;
  }

  await withAction(`已忘记 ${ssid}`, async () => {
    await deviceApi.forgetWiFi(ssid);
    await refreshNetwork();
  });
};

const setBrightness = async () => {
  const displayId = displayStatus.value?.displayId || "default";
  await withAction(`亮度已设置为 ${brightnessPercent.value}%`, async () => {
    displayStatus.value = await deviceApi.setBrightness(displayId, brightnessPercent.value);
    brightnessPercent.value = displayStatus.value.percent;
  });
};

const setVolume = async () => {
  const sink = audioStatus.value?.sink || "default";
  await withAction(`音量已设置为 ${volumePercent.value}%`, async () => {
    audioStatus.value = await deviceApi.setVolume(sink, volumePercent.value);
    volumePercent.value = audioStatus.value.percent;
  });
};

const setMute = async (muted: boolean) => {
  const sink = audioStatus.value?.sink || "default";
  await withAction(muted ? "已静音" : "已取消静音", async () => {
    audioStatus.value = await deviceApi.setMute(sink, muted);
    volumePercent.value = audioStatus.value.percent;
  });
};

const isEphemeralStorageDevice = (device: StorageDevice) =>
  device.name.startsWith("zram") || device.deviceId.includes("zram");

const visibleStorageDevices = computed(() => storageDevices.value.filter((device) => !isEphemeralStorageDevice(device)));

const isSystemStorageDevice = (device: StorageDevice) =>
  !device.removable || ["/", "/boot", "/var/log", "/var/log.hdd"].includes(device.mountPath);

const canManageStorageDevice = (device: StorageDevice) => device.removable && !isSystemStorageDevice(device);

const storageAction = async (action: "mount" | "unmount" | "eject", deviceId: string) => {
  const labels = { mount: "挂载", unmount: "卸载", eject: "弹出" };
  await withAction(`已执行${labels[action]}操作`, async () => {
    if (action === "mount") {
      await deviceApi.mountStorage(deviceId);
    } else if (action === "unmount") {
      await deviceApi.unmountStorage(deviceId);
    } else {
      await deviceApi.ejectStorage(deviceId);
    }
    await refreshStorage();
  });
};

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatUptime = (seconds = 0) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

onMounted(() => {
  void refreshAll();
});
</script>

<template>
  <main class="settings-page">
    <aside class="settings-sidebar">
      <button class="back-button" type="button" @click="router.push({ name: 'home' })">返回首页</button>

      <div class="settings-title">
        <span>设置</span>
        <h1>系统设置</h1>
      </div>

      <nav class="settings-list" aria-label="设置分区">
        <button
          v-for="section in sections"
          :key="section.key"
          class="settings-list-item"
          :class="{ active: section.key === activeSectionKey }"
          type="button"
          @click="activeSectionKey = section.key"
        >
          <strong>{{ section.title }}</strong>
          <span>{{ section.subtitle }}</span>
        </button>
      </nav>
    </aside>

    <section class="settings-detail">
      <header class="detail-header">
        <div>
          <span>系统设置</span>
          <h2>{{ activeSection.title }}</h2>
          <p>{{ activeSection.subtitle }}</p>
        </div>
        <button class="ghost-button" type="button" :disabled="loading" @click="refreshActiveSection">
          {{ loading ? "处理中" : "刷新" }}
        </button>
      </header>

      <p v-if="actionMessage" class="status-line ok">{{ actionMessage }}</p>
      <p v-if="actionError" class="status-line error">{{ actionError }}</p>

      <div v-if="activeSection.key === 'overview'" class="detail-grid">
        <article class="setting-card">
          <span>主机</span>
          <strong>{{ deviceStatus?.hostname || "未知" }}</strong>
          <small>Agent {{ deviceStatus?.agentVersion || "-" }} · 运行 {{ formatUptime(deviceStatus?.uptimeSeconds) }}</small>
        </article>
        <article v-for="(enabled, name) in capabilities" :key="name" class="setting-card">
          <span>{{ name }}</span>
          <strong>{{ enabled ? "可用" : "不可用" }}</strong>
        </article>
      </div>

      <div v-else-if="activeSection.key === 'network'" class="panel-stack">
        <article class="setting-card wide">
          <span>网络状态</span>
          <strong>{{ networkStatus?.state || "未知" }}</strong>
          <small>主连接：{{ networkStatus?.primary || "-" }} · Wi-Fi：{{ networkStatus?.wifiEnabled ? "开启" : "关闭" }} · {{ networkStatus?.backend || "-" }}</small>
        </article>

        <article class="setting-card wide current-wifi-card">
          <div>
            <span>当前 Wi-Fi</span>
            <strong>{{ currentWiFiSSID || "未连接 Wi-Fi" }}</strong>
            <small v-if="currentAccessPoint">
              信号 {{ currentAccessPoint.strength }}% · {{ formatSecurity(currentAccessPoint.security) }} · {{ currentAccessPoint.frequency }} MHz
            </small>
            <small v-else>当前连接会在这里单独显示，便于和可切换网络区分。</small>
          </div>
          <button type="button" :disabled="loading || !currentWiFiSSID" @click="disconnectWiFi">断开</button>
        </article>

        <article class="control-card">
          <div class="control-header">
            <div>
              <span>Wi-Fi 扫描</span>
              <strong>{{ wifiList.length }} 个网络</strong>
            </div>
            <div class="mini-actions">
              <button type="button" @click="openWiFiPasswordDialog()">隐藏网络</button>
              <button type="button" @click="refreshActiveSection">重新扫描</button>
            </div>
          </div>
          <div class="wifi-list">
            <button
              v-for="ap in wifiList"
              :key="`${ap.ssid}-${ap.bssid}`"
              class="wifi-row"
              :class="{ selected: selectedSSID === ap.ssid, connected: isCurrentAccessPoint(ap) }"
              type="button"
              @click="chooseAccessPoint(ap)"
            >
              <div class="wifi-main">
                <strong>{{ ap.ssid || "(隐藏网络)" }}</strong>
                <span>{{ ap.strength }}% · {{ formatSecurity(ap.security) }} · {{ ap.frequency }} MHz</span>
              </div>
              <div class="wifi-badges">
                <span v-if="isSecuredWiFi(ap.security)" class="key-icon" aria-label="需要密码"></span>
                <span v-if="isCurrentAccessPoint(ap)" class="connected-badge">已连接</span>
              </div>
            </button>
            <p v-if="!wifiList.length" class="empty">没有扫描到 Wi-Fi 网络</p>
          </div>
          <div class="actions-row">
            <button type="button" @click="forgetWiFi">忘记</button>
          </div>
        </article>

        <div v-if="wifiDialogOpen" class="wifi-dialog-backdrop" @click.self="closeWiFiDialog">
          <section class="wifi-dialog" role="dialog" aria-modal="true" aria-label="Wi-Fi 连接">
            <header class="wifi-dialog-header">
              <div>
                <span>{{ pendingAccessPoint ? "Wi-Fi 密码" : "隐藏 Wi-Fi" }}</span>
                <strong>{{ pendingAccessPoint?.ssid || "输入网络名称" }}</strong>
              </div>
              <button type="button" @click="closeWiFiDialog">关闭</button>
            </header>

            <div class="drawn-inputs">
              <button
                v-if="!pendingAccessPoint"
                class="drawn-input"
                :class="{ active: wifiInputMode === 'ssid' }"
                type="button"
                @click="wifiInputMode = 'ssid'"
              >
                <span>SSID</span>
                <strong>{{ manualSSID || "点这里输入网络名称" }}</strong>
              </button>
              <button
                class="drawn-input"
                :class="{ active: wifiInputMode === 'password' }"
                type="button"
                @click="wifiInputMode = 'password'"
              >
                <span>密码</span>
                <strong>{{ wifiPassword ? "•".repeat(wifiPassword.length) : "点这里输入密码" }}</strong>
              </button>
            </div>

            <label class="check-row remember-row">
              <input v-model="rememberWiFi" type="checkbox" />
              <span>记住网络</span>
            </label>

            <div class="soft-keyboard" aria-label="Wi-Fi soft keyboard">
              <div v-for="(row, rowIndex) in keyboardRows" :key="rowIndex" class="keyboard-row">
                <button
                  v-for="key in row"
                  :key="`${rowIndex}-${key}`"
                  class="keyboard-key"
                  :class="{ wide: key === ' ' }"
                  type="button"
                  @click="appendKeyboardKey(key)"
                >
                  {{ key === " " ? "空格" : key }}
                </button>
              </div>
              <div class="keyboard-row keyboard-tools">
                <button type="button" @click="keyboardShift = !keyboardShift">{{ keyboardShift ? "abc" : "ABC" }}</button>
                <button type="button" @click="backspaceKeyboard">删除</button>
                <button type="button" @click="clearKeyboardValue">清空</button>
              </div>
            </div>

            <div class="wifi-dialog-actions">
              <button type="button" @click="closeWiFiDialog">取消</button>
              <button type="button" :disabled="loading || !pendingSSID" @click="connectWiFi">连接</button>
            </div>
          </section>
        </div>
      </div>

      <div v-else-if="activeSection.key === 'storage'" class="panel-stack">
        <article class="control-card">
          <div class="control-header">
            <div>
              <span>USB 设备</span>
              <strong>{{ usbDevices.length }} 个</strong>
            </div>
          </div>
          <div class="item-list">
            <div v-for="device in usbDevices" :key="device.deviceId" class="device-row">
              <strong>{{ device.product || device.deviceId }}</strong>
              <span>{{ device.manufacturer || "-" }} · {{ device.vendorId }}:{{ device.productId }} · {{ device.class || "-" }}</span>
            </div>
            <p v-if="!usbDevices.length" class="empty">没有检测到 USB 设备</p>
          </div>
        </article>

        <article class="control-card">
          <div class="control-header">
            <div>
              <span>存储设备</span>
              <strong>{{ visibleStorageDevices.length }} 个</strong>
            </div>
          </div>
          <div class="item-list">
            <div v-for="device in visibleStorageDevices" :key="device.deviceId" class="device-row with-actions">
              <div>
                <strong>
                  {{ device.label || device.name || device.deviceId }}
                  <span class="storage-badge" :class="{ system: isSystemStorageDevice(device) }">
                    {{ isSystemStorageDevice(device) ? "系统盘" : "外接盘" }}
                  </span>
                </strong>
                <span>{{ device.filesystem || "-" }} · {{ formatBytes(device.sizeBytes) }} · {{ device.mounted ? device.mountPath : "未挂载" }}</span>
              </div>
              <div v-if="canManageStorageDevice(device)" class="mini-actions">
                <button v-if="!device.mounted" type="button" @click="storageAction('mount', device.deviceId)">挂载</button>
                <button v-else type="button" @click="storageAction('unmount', device.deviceId)">卸载</button>
                <button type="button" @click="storageAction('eject', device.deviceId)">弹出</button>
              </div>
              <small v-else class="system-storage-note">系统盘用于运行当前设备，已隐藏卸载/弹出操作。</small>
            </div>
            <p v-if="!visibleStorageDevices.length" class="empty">没有检测到可显示的存储设备。</p>
          </div>
        </article>
      </div>

      <div v-else-if="activeSection.key === 'display'" class="panel-stack">
        <article class="setting-card wide screen-size-card">
          <div>
            <span>本地屏幕尺寸</span>
            <strong>{{ localScreenSizeLabel }}</strong>
            <small>物理宽高比 {{ localScreenAspectRatio }}:1，用于本机屏幕规格展示。</small>
          </div>
        </article>

        <article class="control-card">
          <span>亮度</span>
          <strong>{{ displayStatus?.percent ?? brightnessPercent }}%</strong>
          <small>{{ displayStatus?.displayId || "default" }} · {{ displayStatus?.backend || "-" }}</small>
          <input v-model.number="brightnessPercent" min="1" max="100" type="range" />
          <div class="actions-row">
            <button type="button" @click="setBrightness">应用亮度</button>
          </div>
        </article>
      </div>

      <div v-else-if="activeSection.key === 'audio'" class="panel-stack">
        <article class="control-card">
          <span>音频输出</span>
          <strong>{{ audioStatus?.muted ? "静音" : `${audioStatus?.percent ?? volumePercent}%` }}</strong>
          <small>{{ audioStatus?.sink || "default" }} · {{ audioStatus?.backend || "-" }}</small>
          <input v-model.number="volumePercent" min="0" max="100" type="range" />
          <div class="actions-row">
            <button type="button" @click="setVolume">应用音量</button>
            <button type="button" @click="setMute(!audioStatus?.muted)">
              {{ audioStatus?.muted ? "取消静音" : "静音" }}
            </button>
          </div>
        </article>
      </div>

      <div v-else class="detail-grid">
        <article class="setting-card wide">
          <div>
            <span>右侧对话列表样式</span>
            <small>切换后返回首页即可查看实际效果。</small>
          </div>
          <div class="mode-switch" role="radiogroup" aria-label="对话列表显示模式">
            <button
              v-for="option in conversationDisplayModeOptions"
              :key="option.value"
              class="mode-option"
              :class="{ selected: conversationDisplayMode === option.value }"
              type="button"
              role="radio"
              :aria-checked="conversationDisplayMode === option.value"
              @click="setConversationDisplayMode(option.value)"
            >
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </button>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.settings-page {
  width: 100vw;
  height: 100vh;
  min-width: var(--ax-screen-min-width);
  min-height: var(--ax-screen-min-height);
  display: grid;
  grid-template-columns: var(--ax-settings-sidebar-width) minmax(0, 1fr);
  gap: var(--ax-page-gap);
  padding: var(--ax-page-padding);
  overflow: hidden;
  color: #dcecf2;
  background:
    radial-gradient(circle at 25% 20%, rgba(0, 220, 235, 0.09), transparent 28%),
    linear-gradient(180deg, #02070c 0%, #020b12 100%);
  font-family: "Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
}

.settings-sidebar,
.settings-detail {
  min-height: 0;
  border: 1px solid rgba(108, 197, 216, 0.36);
  border-radius: var(--ax-panel-radius);
  background:
    radial-gradient(240px 140px at 28% 0%, rgba(81, 162, 184, 0.18), transparent 72%),
    linear-gradient(180deg, rgba(8, 28, 38, 0.76), rgba(3, 14, 21, 0.82));
  box-shadow:
    0 22px 70px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(186, 241, 255, 0.1);
}

.settings-sidebar {
  display: flex;
  flex-direction: column;
  padding: var(--ax-panel-padding);
}

.back-button,
.ghost-button,
.setting-card button,
.control-card button,
.mini-actions button {
  border: 1px solid rgba(93, 185, 202, 0.36);
  border-radius: var(--ax-control-radius);
  min-height: var(--ax-control-height);
  padding: 0 12px;
  color: rgba(214, 242, 248, 0.95);
  background: rgba(7, 32, 47, 0.86);
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.settings-title {
  margin: var(--ax-page-gap) 0 var(--ax-panel-gap);
}

.settings-title span,
.detail-header span,
.setting-card span,
.control-card span {
  color: rgba(104, 231, 244, 0.9);
  font-size: var(--ax-font-micro);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.settings-title h1,
.detail-header h2 {
  margin: 7px 0 0;
  font-size: var(--ax-font-title);
  line-height: 1.1;
}

.settings-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.settings-list-item {
  width: 100%;
  display: block;
  margin-bottom: var(--ax-panel-gap);
  padding: var(--ax-panel-gap);
  border: 1px solid rgba(88, 159, 177, 0.26);
  border-radius: var(--ax-card-radius);
  color: inherit;
  text-align: left;
  background: rgba(6, 24, 33, 0.52);
  cursor: pointer;
}

.settings-list-item.active {
  border-color: rgba(110, 221, 242, 0.58);
  background: rgba(7, 32, 47, 0.76);
}

.settings-list-item strong,
.setting-card strong,
.control-card strong,
.device-row strong,
.wifi-row strong {
  display: block;
  color: rgba(228, 247, 251, 0.96);
  font-size: var(--ax-font-body);
}

.settings-list-item span,
.detail-header p,
.setting-card small,
.control-card small,
.device-row span,
.wifi-row span {
  display: block;
  margin-top: 6px;
  color: rgba(169, 199, 210, 0.8);
  font-size: var(--ax-font-caption);
  line-height: var(--ax-line-body);
}

.settings-detail {
  padding: var(--ax-page-padding);
  overflow: auto;
}

.detail-header,
.control-header,
.with-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.detail-header {
  padding-bottom: var(--ax-page-gap);
  border-bottom: 1px solid rgba(103, 180, 198, 0.2);
}

.status-line {
  margin: 12px 0 0;
  font-size: var(--ax-font-caption);
}

.status-line.ok {
  color: rgba(106, 225, 241, 0.9);
}

.status-line.error {
  color: #ffb4b4;
}

.detail-grid,
.panel-stack {
  margin-top: var(--ax-page-gap);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ax-panel-gap);
}

.panel-stack {
  display: grid;
  gap: var(--ax-panel-gap);
}

.setting-card,
.control-card {
  min-width: 0;
  padding: var(--ax-panel-padding);
  border: 1px solid rgba(88, 159, 177, 0.26);
  border-radius: var(--ax-card-radius);
  background: rgba(6, 24, 33, 0.52);
}

.wide {
  grid-column: 1 / -1;
}

.current-wifi-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-color: rgba(91, 226, 248, 0.42);
  background:
    radial-gradient(220px 110px at 18% 0%, rgba(70, 218, 255, 0.16), transparent 72%),
    rgba(6, 24, 33, 0.62);
}

.screen-size-card {
  border-color: rgba(255, 210, 126, 0.36);
  background:
    radial-gradient(220px 110px at 18% 0%, rgba(255, 210, 126, 0.12), transparent 72%),
    rgba(6, 24, 33, 0.58);
}

.wifi-list,
.item-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
  max-height: var(--ax-list-max-height);
  overflow: auto;
}

.wifi-row,
.device-row {
  padding: 11px 12px;
  border: 1px solid rgba(88, 159, 177, 0.2);
  border-radius: 12px;
  background: rgba(4, 16, 25, 0.48);
}

.wifi-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.wifi-row.connected {
  border-color: rgba(106, 225, 241, 0.68);
  background:
    linear-gradient(90deg, rgba(88, 219, 255, 0.16), transparent 58%),
    rgba(7, 35, 51, 0.72);
}

.wifi-row.selected {
  border-color: rgba(91, 226, 248, 0.72);
  background: rgba(7, 35, 51, 0.82);
}

.storage-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  margin-left: 8px;
  padding: 0 8px;
  border: 1px solid rgba(106, 225, 241, 0.38);
  border-radius: 999px;
  color: rgba(214, 242, 248, 0.95);
  background: rgba(7, 32, 47, 0.72);
  font-size: 11px;
  font-weight: 800;
  vertical-align: middle;
}

.storage-badge.system {
  color: #061c23;
  background: rgba(255, 210, 126, 0.9);
  border-color: rgba(255, 210, 126, 0.9);
}

.system-storage-note {
  flex: 0 0 auto;
  max-width: 230px;
  color: rgba(255, 210, 126, 0.88);
  font-size: 11px;
  line-height: 1.45;
  text-align: right;
}

.wifi-main {
  min-width: 0;
}

.wifi-main strong,
.wifi-main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wifi-badges {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.connected-badge {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 9px;
  color: #06212a;
  background: rgba(106, 225, 241, 0.88);
  font-size: 11px;
  font-weight: 800;
}

.key-icon {
  position: relative;
  width: 26px;
  height: 20px;
  display: inline-block;
}

.key-icon::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 1px;
  width: 10px;
  height: 10px;
  border: 2px solid rgba(104, 231, 244, 0.95);
  border-radius: 999px;
}

.key-icon::after {
  content: "";
  position: absolute;
  top: 8px;
  left: 12px;
  width: 13px;
  height: 3px;
  border-radius: 999px;
  background: rgba(104, 231, 244, 0.95);
  box-shadow:
    6px 4px 0 -1px rgba(104, 231, 244, 0.95),
    10px 4px 0 -1px rgba(104, 231, 244, 0.95);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

label span {
  display: block;
  margin-bottom: 6px;
  color: rgba(169, 199, 210, 0.86);
  font-size: 11px;
}

input[type="text"],
input[type="password"],
input:not([type]) {
  width: 100%;
  height: var(--ax-control-height);
  border: 1px solid rgba(88, 159, 177, 0.3);
  border-radius: 10px;
  padding: 0 10px;
  color: #e8f8fb;
  background: rgba(2, 12, 18, 0.72);
}

input[type="range"] {
  width: 100%;
  margin: 18px 0 8px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.check-row span {
  margin: 0;
}

.actions-row,
.mini-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.mini-actions {
  justify-content: flex-end;
  margin-top: 0;
}

.wifi-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: var(--ax-modal-padding);
  background: rgba(0, 7, 12, 0.64);
  backdrop-filter: blur(10px);
}

.wifi-dialog {
  width: min(720px, 100%);
  max-height: calc(100vh - (var(--ax-modal-padding) * 2));
  display: grid;
  gap: var(--ax-panel-gap);
  padding: var(--ax-modal-padding);
  overflow: auto;
  border: 1px solid rgba(108, 197, 216, 0.48);
  border-radius: 18px;
  background:
    radial-gradient(280px 140px at 20% 0%, rgba(70, 218, 255, 0.18), transparent 72%),
    linear-gradient(180deg, rgba(8, 28, 38, 0.96), rgba(3, 14, 21, 0.98));
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.48);
}

.wifi-dialog-header,
.wifi-dialog-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.wifi-dialog-header span,
.drawn-input span {
  display: block;
  color: rgba(104, 231, 244, 0.9);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.wifi-dialog-header strong {
  display: block;
  margin-top: 5px;
  color: rgba(228, 247, 251, 0.96);
  font-size: 18px;
}

.drawn-inputs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.drawn-input {
  min-height: 68px;
  display: grid;
  align-content: center;
  gap: 6px;
  padding: 11px 12px;
  border: 1px solid rgba(88, 159, 177, 0.3);
  border-radius: 14px;
  color: inherit;
  text-align: left;
  background: rgba(4, 16, 25, 0.62);
  cursor: pointer;
}

.drawn-input.active {
  border-color: rgba(91, 226, 248, 0.78);
  background: rgba(7, 35, 51, 0.86);
}

.drawn-input strong {
  min-width: 0;
  overflow-wrap: anywhere;
  color: rgba(232, 248, 251, 0.96);
  font-size: 16px;
}

.remember-row {
  justify-self: start;
}

.soft-keyboard {
  display: grid;
  gap: 7px;
}

.keyboard-row {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.keyboard-key,
.keyboard-tools button,
.wifi-dialog-header button,
.wifi-dialog-actions button {
  min-height: var(--ax-control-height);
  border: 1px solid rgba(93, 185, 202, 0.36);
  border-radius: 10px;
  padding: 0 11px;
  color: rgba(214, 242, 248, 0.95);
  background: rgba(7, 32, 47, 0.86);
  cursor: pointer;
}

.keyboard-key {
  min-width: 40px;
}

.keyboard-key.wide {
  min-width: 86px;
}

.keyboard-tools {
  margin-top: 2px;
}

.keyboard-tools button {
  min-width: 86px;
}

.wifi-dialog-actions {
  justify-content: flex-end;
}

.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.mode-option {
  min-height: 82px;
  padding: 13px;
  border-radius: 14px;
  border: 1px solid rgba(88, 159, 177, 0.3);
  color: rgba(228, 247, 251, 0.92);
  text-align: left;
  background: rgba(4, 16, 25, 0.62);
  cursor: pointer;
}

.mode-option.selected {
  border-color: rgba(91, 226, 248, 0.78);
  background:
    radial-gradient(160px 80px at 20% 0%, rgba(70, 218, 255, 0.18), transparent 70%),
    rgba(7, 35, 51, 0.82);
}

.empty {
  margin: 0;
  color: rgba(169, 199, 210, 0.74);
  font-size: 12px;
}

@media (max-width: 860px), (max-height: 520px) {
  .settings-page {
    grid-template-columns: var(--ax-settings-sidebar-width) minmax(0, 1fr);
    gap: var(--ax-page-gap);
    padding: var(--ax-page-padding);
  }

  .settings-sidebar,
  .settings-detail {
    padding: var(--ax-panel-padding);
  }

  .detail-grid,
  .form-grid,
  .drawn-inputs {
    grid-template-columns: 1fr;
  }

  .current-wifi-card,
  .wifi-row,
  .wifi-dialog-header {
    align-items: stretch;
    flex-direction: column;
  }

  .wifi-badges {
    justify-content: flex-start;
  }

  .system-storage-note {
    max-width: none;
    text-align: left;
  }

  .wifi-dialog-backdrop {
    padding: var(--ax-modal-padding);
  }

  .wifi-dialog {
    max-height: calc(100vh - (var(--ax-modal-padding) * 2));
    gap: var(--ax-panel-gap);
    padding: var(--ax-modal-padding);
    border-radius: var(--ax-panel-radius);
  }

  .keyboard-row {
    gap: 4px;
  }

  .keyboard-key {
    min-width: 30px;
    min-height: var(--ax-control-height);
    padding: 0 7px;
    font-size: 12px;
  }

  .keyboard-key.wide {
    min-width: 72px;
  }
}
</style>
