<script setup lang="ts">
import { computed, ref } from "vue";
import AxionTimeCard from "./AxionTimeCard.vue";
import AxionSystemStatusCard from "./AxionSystemStatusCard.vue";
import AxionNetworkCard from "./AxionNetworkCard.vue";
import type { SystemMetric } from "./AxionSystemStatusCard.vue";

const timeValue = ref("22:48");
const dateValue = ref("2025/05/20 Tue");
const timeWidth = ref(104);
const systemWidth = ref(200);
const networkWidth = ref(112);
const uploadRate = ref("3.6 KB/s");
const downloadRate = ref("2.1 KB/s");

const cpu = ref(12);
const ram = ref(32);
const gpu = ref(8);
const npu = ref(3);

const sparkline = ref([24, 42, 26, 28, 44, 22, 27, 48, 36, 54]);

const metrics = computed<SystemMetric[]>(() => [
  { key: "cpu", label: "CPU", value: cpu.value },
  { key: "ram", label: "RAM", value: ram.value },
  { key: "gpu", label: "GPU", value: gpu.value },
  { key: "npu", label: "NPU", value: npu.value },
]);

const randomizeNetwork = () => {
  sparkline.value = sparkline.value.map(() => 16 + Math.round(Math.random() * 34));
};
</script>

<template>
  <main class="status-debug-shell">
    <aside class="debug-panel">
      <div class="panel-header">
        <p class="eyebrow">Status Cards Debug</p>
        <h1>Time + System + Network</h1>
      </div>

      <label class="field">
        <span>Time</span>
        <input v-model="timeValue" type="text" />
      </label>

      <label class="field">
        <span>Date</span>
        <input v-model="dateValue" type="text" />
      </label>

      <label class="field">
        <span>Time width</span>
        <input v-model.number="timeWidth" type="range" min="92" max="132" step="1" />
        <strong>{{ timeWidth }}px</strong>
      </label>

      <label class="field">
        <span>System width</span>
        <input v-model.number="systemWidth" type="range" min="180" max="240" step="1" />
        <strong>{{ systemWidth }}px</strong>
      </label>

      <label class="field">
        <span>Network width</span>
        <input v-model.number="networkWidth" type="range" min="100" max="150" step="1" />
        <strong>{{ networkWidth }}px</strong>
      </label>

      <div class="field">
        <span>System metrics</span>
        <div class="metric-controls">
          <label>
            <span>CPU</span>
            <input v-model.number="cpu" type="range" min="0" max="100" step="1" />
            <strong>{{ cpu }}%</strong>
          </label>
          <label>
            <span>RAM</span>
            <input v-model.number="ram" type="range" min="0" max="100" step="1" />
            <strong>{{ ram }}%</strong>
          </label>
          <label>
            <span>GPU</span>
            <input v-model.number="gpu" type="range" min="0" max="100" step="1" />
            <strong>{{ gpu }}%</strong>
          </label>
          <label>
            <span>NPU</span>
            <input v-model.number="npu" type="range" min="0" max="100" step="1" />
            <strong>{{ npu }}%</strong>
          </label>
        </div>
      </div>

      <label class="field">
        <span>Upload rate</span>
        <input v-model="uploadRate" type="text" />
      </label>

      <label class="field">
        <span>Download rate</span>
        <input v-model="downloadRate" type="text" />
      </label>

      <button class="action-btn" type="button" @click="randomizeNetwork">Randomize graph</button>
    </aside>

    <section class="preview-panel">
      <div class="preview-stage">
        <AxionTimeCard :time="timeValue" :date="dateValue" :width="timeWidth" />
        <AxionSystemStatusCard :metrics="metrics" :width="systemWidth" />
        <AxionNetworkCard
          :points="sparkline"
          :upload-rate="uploadRate"
          :download-rate="downloadRate"
          :width="networkWidth"
        />
      </div>
    </section>
  </main>
</template>

<style scoped>
.status-debug-shell {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  min-height: 100vh;
  background:
    radial-gradient(circle at 70% 22%, rgba(21, 142, 164, 0.12) 0%, transparent 24%),
    radial-gradient(circle at 18% 78%, rgba(16, 96, 114, 0.15) 0%, transparent 28%),
    linear-gradient(180deg, #02070d 0%, #020b12 100%);
  color: #dcecf2;
}

.debug-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
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

.field input[type="text"],
.field input[type="range"] {
  width: 100%;
}

.field input[type="text"] {
  height: 42px;
  padding: 0 12px;
  border: 1px solid rgba(87, 148, 168, 0.3);
  border-radius: 12px;
  background: rgba(9, 23, 32, 0.84);
  color: #dcecf2;
}

.metric-controls {
  display: grid;
  gap: 10px;
}

.metric-controls label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(74, 122, 139, 0.22);
  background: rgba(10, 22, 30, 0.7);
}

.action-btn {
  height: 44px;
  border: 1px solid rgba(96, 170, 190, 0.26);
  border-radius: 12px;
  background:
    linear-gradient(
      180deg,
      rgba(18, 57, 70, 0.9) 0%,
      rgba(8, 28, 37, 0.92) 100%
    );
  color: #dcecf2;
  font-size: 13px;
  cursor: pointer;
}

.preview-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.preview-stage {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 40px;
  border-radius: 36px;
  background:
    radial-gradient(circle at 24% 16%, rgba(34, 152, 176, 0.08) 0%, transparent 18%),
    linear-gradient(180deg, rgba(5, 14, 20, 0.78) 0%, rgba(4, 10, 15, 0.92) 100%);
  border: 1px solid rgba(67, 123, 141, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(170, 215, 227, 0.04),
    0 24px 90px rgba(0, 0, 0, 0.36);
}
</style>
