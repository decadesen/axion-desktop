<script setup lang="ts">
const defaultPoints = [24, 42, 26, 28, 44, 22, 27, 48, 36, 54];

const props = withDefaults(
  defineProps<{
    title?: string;
    points?: number[];
    uploadRate?: string;
    downloadRate?: string;
    width?: number | string;
  }>(),
  {
    title: "Network",
    uploadRate: "3.6 KB/s",
    downloadRate: "2.1 KB/s",
    width: 112,
  },
);

const normalizeSize = (value: number | string) =>
  typeof value === "number" ? `${value}px` : value;

const resolvedPoints = computed(() => props.points ?? defaultPoints);

const pathData = computed(() => {
  const points = resolvedPoints.value;
  if (!points.length) return "";

  const width = 92;
  const height = 42;
  const step = points.length > 1 ? width / (points.length - 1) : width;

  return points
    .map((point, index) => {
      const x = index * step;
      const normalized = Math.max(0, Math.min(height, point));
      const y = height - normalized;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
});
</script>

<script lang="ts">
import { computed } from "vue";
</script>

<template>
  <section class="axion-network-card" :style="{ width: normalizeSize(width) }">
    <header class="card-header">{{ title }}</header>

    <div class="network-graph">
      <svg viewBox="0 0 92 42" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="networkLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(71, 214, 230, 0.52)" />
            <stop offset="100%" stop-color="rgba(71, 214, 230, 0.95)" />
          </linearGradient>
        </defs>
        <path class="network-path-shadow" :d="pathData" />
        <path class="network-path" :d="pathData" />
      </svg>
    </div>

    <footer class="network-footer">
      <span class="network-pill">↑ {{ uploadRate }}</span>
      <span class="network-pill">↓ {{ downloadRate }}</span>
    </footer>
  </section>
</template>

<style scoped>
.axion-network-card {
  position: relative;
  box-sizing: border-box;
  padding: 14px 14px 14px;
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

.axion-network-card::before {
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
.network-graph,
.network-footer {
  position: relative;
  z-index: 1;
}

.card-header {
  color: rgba(225, 239, 245, 0.92);
  font-size: 11px;
  line-height: 1.1;
  font-weight: 600;
}

.network-graph {
  margin-top: 14px;
}

.network-graph svg {
  display: block;
  width: 100%;
  height: 46px;
}

.network-path-shadow {
  fill: none;
  stroke: rgba(71, 214, 230, 0.24);
  stroke-width: 4.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: blur(3px);
}

.network-path {
  fill: none;
  stroke: #41d6e6;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 6px rgba(65, 214, 230, 0.18));
}

.network-footer {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.network-pill {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(7, 24, 33, 0.86);
  color: rgba(187, 214, 223, 0.84);
  font-size: 9px;
  line-height: 1;
  white-space: nowrap;
}
</style>
