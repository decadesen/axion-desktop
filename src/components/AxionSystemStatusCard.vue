<script setup lang="ts">
export type SystemMetric = {
  key: string;
  label: string;
  value: number;
};

const defaultMetrics: SystemMetric[] = [
  { key: "cpu", label: "CPU", value: 12 },
  { key: "ram", label: "RAM", value: 32 },
  { key: "gpu", label: "GPU", value: 8 },
  { key: "npu", label: "NPU", value: 3 },
];

const props = withDefaults(
  defineProps<{
    title?: string;
    metrics?: SystemMetric[];
    width?: number | string;
  }>(),
  {
    title: "System Status",
    width: 200,
  },
);

const normalizeSize = (value: number | string) =>
  typeof value === "number" ? `${value}px` : value;

const resolvedMetrics = computed(() => props.metrics ?? defaultMetrics);
const circumference = 2 * Math.PI * 17;
const dashOffsetFor = (value: number) => circumference * (1 - Math.max(0, Math.min(100, value)) / 100);
</script>

<script lang="ts">
import { computed } from "vue";
</script>

<template>
  <section class="axion-system-card" :style="{ width: normalizeSize(width) }">
    <header class="card-header">{{ title }}</header>

    <div class="metric-grid">
      <article v-for="metric in resolvedMetrics" :key="metric.key" class="metric-item">
        <div class="metric-ring">
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <circle class="ring-base" cx="22" cy="22" r="17" />
            <circle
              class="ring-value"
              cx="22"
              cy="22"
              r="17"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="dashOffsetFor(metric.value)"
            />
          </svg>
          <span class="metric-number">{{ metric.value }}%</span>
        </div>
        <span class="metric-label">{{ metric.label }}</span>
      </article>
    </div>
  </section>
</template>

<style scoped>
.axion-system-card {
  position: relative;
  box-sizing: border-box;
  padding: 14px 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(0, 230, 255, 0.86);
  background:
    linear-gradient(
      166deg,
      rgba(94, 166, 184, 0.12) 0% 6.8%,
      rgba(74, 136, 152, 0.08) 8.3%,
      rgba(52, 94, 108, 0.03) 10.2%,
      transparent 13% 78%,
      rgba(52, 94, 108, 0.03) 89.8%,
      rgba(74, 136, 152, 0.08) 91.7%,
      rgba(94, 166, 184, 0.12) 93.3% 100%
    ),
    linear-gradient(rgba(5, 18, 26, 0.84), rgba(3, 14, 19, 0.86)) padding-box,
    rgba(255, 255, 255, 0.055);
  box-shadow:
    inset 0 0 0 1px rgba(0, 230, 255, 0.84),
    inset 0 0 20px rgba(255, 255, 255, 0.04),
    0 0 24px rgba(0, 230, 255, 0.32),
    0 22px 46px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px) saturate(118%);
  -webkit-backdrop-filter: blur(18px) saturate(118%);
}

.axion-system-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    linear-gradient(
      125deg,
      rgba(255, 255, 255, 0.18) 0%,
      rgba(8, 18, 22, 0.02) 46%,
      rgba(8, 18, 22, 0.22) 100%
    );
  background-size: 220% 220%;
  filter: drop-shadow(0 0 14px rgba(0, 230, 255, 0.56));
}

.card-header,
.metric-grid {
  position: relative;
  z-index: 1;
}

.card-header {
  color: rgba(225, 239, 245, 0.92);
  font-size: 11px;
  line-height: 1.1;
  font-weight: 600;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.metric-ring {
  position: relative;
  width: 44px;
  height: 44px;
}

.metric-ring svg {
  width: 44px;
  height: 44px;
  transform: rotate(-90deg);
}

.ring-base {
  fill: none;
  stroke: rgba(62, 95, 111, 0.42);
  stroke-width: 3.2;
}

.ring-value {
  fill: none;
  stroke: #1ce3f0;
  stroke-width: 3.2;
  stroke-linecap: round;
  filter: drop-shadow(0 0 5px rgba(28, 227, 240, 0.22));
}

.metric-number {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(224, 241, 246, 0.92);
  font-size: 10px;
  line-height: 1;
  font-weight: 600;
}

.metric-label {
  color: rgba(158, 183, 194, 0.86);
  font-size: 10px;
  line-height: 1;
}
</style>
