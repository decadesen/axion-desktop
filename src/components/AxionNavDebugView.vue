<script setup lang="ts">
import { computed, ref } from "vue";
import AxionNavRail from "./AxionNavRail.vue";
import type { NavRailItem } from "./AxionNavRail.vue";

type NavKey = "home" | "agent" | "memory" | "tools" | "settings";

const activeKey = ref<NavKey>("home");
const railWidth = ref(84);
const railGap = ref(12);
const disabledKeys = ref<NavKey[]>([]);

const navItems = computed<NavRailItem[]>(() => [
  { key: "home", label: "首页", icon: "home", disabled: disabledKeys.value.includes("home") },
  { key: "agent", label: "智能体", icon: "agent", disabled: disabledKeys.value.includes("agent") },
  { key: "memory", label: "记忆", icon: "memory", disabled: disabledKeys.value.includes("memory") },
  { key: "tools", label: "工具", icon: "tools", disabled: disabledKeys.value.includes("tools") },
  { key: "settings", label: "设置", icon: "settings", disabled: disabledKeys.value.includes("settings") },
]);

const toggleDisabled = (key: NavKey) => {
  disabledKeys.value = disabledKeys.value.includes(key)
    ? disabledKeys.value.filter((item) => item !== key)
    : [...disabledKeys.value, key];

  if (disabledKeys.value.includes(activeKey.value)) {
    activeKey.value = "home";
  }
};
</script>

<template>
  <main class="nav-debug-shell">
    <aside class="debug-panel">
      <div class="panel-header">
        <p class="eyebrow">导航调试</p>
        <h1>Axion 导航栏</h1>
      </div>

      <label class="field">
        <span>当前项目</span>
        <select v-model="activeKey">
          <option value="home">首页</option>
          <option value="agent">智能体</option>
          <option value="memory">记忆</option>
          <option value="tools">工具</option>
          <option value="settings">设置</option>
        </select>
      </label>

      <label class="field">
        <span>宽度</span>
        <input v-model.number="railWidth" type="range" min="72" max="108" step="1" />
        <strong>{{ railWidth }}px</strong>
      </label>

      <label class="field">
        <span>间距</span>
        <input v-model.number="railGap" type="range" min="8" max="18" step="1" />
        <strong>{{ railGap }}px</strong>
      </label>

      <div class="field">
        <span>禁用项目</span>
        <div class="toggle-grid">
          <label v-for="item in navItems" :key="item.key" class="toggle-chip">
            <input
              :checked="disabledKeys.includes(item.key as NavKey)"
              type="checkbox"
              @change="toggleDisabled(item.key as NavKey)"
            />
            <span>{{ item.label }}</span>
          </label>
        </div>
      </div>
    </aside>

    <section class="preview-panel">
      <div class="preview-stage">
        <AxionNavRail
          :items="navItems"
          :active-key="activeKey"
          :width="railWidth"
          :gap="railGap"
          @select="activeKey = $event as NavKey"
        />
      </div>
    </section>
  </main>
</template>

<style scoped>
.nav-debug-shell {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  min-height: 100vh;
  background:
    radial-gradient(circle at 72% 18%, rgba(23, 142, 164, 0.1) 0%, transparent 22%),
    radial-gradient(circle at 18% 82%, rgba(14, 98, 116, 0.14) 0%, transparent 28%),
    linear-gradient(180deg, #02070d 0%, #020b12 100%);
  color: #dcecf2;
}

.debug-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 28px 24px;
  border-right: 1px solid rgba(85, 145, 164, 0.16);
  background: rgba(4, 14, 21, 0.82);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.panel-header h1 {
  margin: 4px 0 0;
  font-size: 26px;
  line-height: 1.05;
}

.eyebrow {
  margin: 0;
  color: rgba(126, 176, 194, 0.72);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field span {
  color: rgba(192, 215, 224, 0.86);
  font-size: 13px;
}

.field strong {
  color: rgba(133, 215, 230, 0.95);
  font-size: 12px;
  font-weight: 600;
}

.field select,
.field input[type="range"] {
  width: 100%;
}

.field select {
  height: 42px;
  padding: 0 12px;
  border: 1px solid rgba(87, 148, 168, 0.3);
  border-radius: 12px;
  background: rgba(9, 23, 32, 0.84);
  color: #dcecf2;
}

.toggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.toggle-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid rgba(74, 122, 139, 0.22);
  border-radius: 12px;
  background: rgba(10, 22, 30, 0.7);
  color: rgba(197, 219, 227, 0.82);
  font-size: 13px;
}

.preview-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.preview-stage {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: min(820px, 100%);
  min-height: 640px;
  padding: 36px;
  border-radius: 36px;
  background:
    radial-gradient(circle at 18% 18%, rgba(34, 152, 176, 0.08) 0%, transparent 18%),
    linear-gradient(180deg, rgba(5, 14, 20, 0.78) 0%, rgba(4, 10, 15, 0.92) 100%);
  border: 1px solid rgba(67, 123, 141, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(170, 215, 227, 0.04),
    0 24px 90px rgba(0, 0, 0, 0.36);
}
</style>
