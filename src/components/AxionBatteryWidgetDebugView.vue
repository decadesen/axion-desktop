<script setup lang="ts">
import { ref } from "vue";
import AxionBatteryGlassWidget from "./AxionBatteryGlassWidget.vue";

const percentage = ref(10);
const health = ref(10);
const cycles = ref(215);
const status = ref("Charging");
const widgetWidth = ref(220);
const widgetHeight = ref(220);
</script>

<template>
  <main class="battery-debug-shell">
    <aside class="debug-panel">
      <div class="panel-header">
        <p class="eyebrow">Widget Debug</p>
        <h1>Battery Glass Widget</h1>
      </div>

      <label class="field">
        <span>Percentage</span>
        <input v-model.number="percentage" type="range" min="0" max="100" step="1" />
        <strong>{{ percentage }}%</strong>
      </label>

      <label class="field">
        <span>Health</span>
        <input v-model.number="health" type="range" min="0" max="100" step="1" />
        <strong>{{ health }}%</strong>
      </label>

      <label class="field">
        <span>Cycles</span>
        <input v-model.number="cycles" type="range" min="0" max="500" step="1" />
        <strong>{{ cycles }}</strong>
      </label>

      <label class="field">
        <span>Status</span>
        <input v-model="status" type="text" />
      </label>

      <label class="field">
        <span>Width</span>
        <input v-model.number="widgetWidth" type="range" min="180" max="280" step="1" />
        <strong>{{ widgetWidth }}px</strong>
      </label>

      <label class="field">
        <span>Height</span>
        <input v-model.number="widgetHeight" type="range" min="180" max="280" step="1" />
        <strong>{{ widgetHeight }}px</strong>
      </label>
    </aside>

    <section class="preview-panel">
      <AxionBatteryGlassWidget
        :percentage="percentage"
        :health="health"
        :cycles="cycles"
        :status="status"
        :width="widgetWidth"
        :height="widgetHeight"
      />
    </section>
  </main>
</template>

<style scoped>
.battery-debug-shell {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  min-height: 100vh;
  background:
    radial-gradient(circle at 72% 18%, rgba(20, 150, 176, 0.08) 0%, transparent 22%),
    linear-gradient(180deg, #02070b 0%, #010408 100%);
  color: #dcecf2;
}

.debug-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px 24px;
  border-right: 1px solid rgba(85, 145, 164, 0.14);
  background: rgba(4, 10, 15, 0.82);
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

.preview-panel {
  display: grid;
  place-items: center;
  padding: 32px;
}
</style>
