<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    time?: string;
    date?: string;
    width?: number | string;
  }>(),
  {
    time: "22:48",
    date: "2025/05/20 Tue",
    width: 104,
  },
);

const normalizeSize = (value: number | string) =>
  typeof value === "number" ? `${value}px` : value;
</script>

<template>
  <section class="axion-time-card" :style="{ width: normalizeSize(width) }">
    <div class="time-value">{{ time }}</div>
    <div class="date-value">{{ date }}</div>
  </section>
</template>

<style scoped>
.axion-time-card {
  position: relative;
  box-sizing: border-box;
  padding: 18px 16px 14px;
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
    linear-gradient(rgba(5, 18, 26, 0.84), rgba(4, 14, 20, 0.84)) padding-box,
    rgba(255, 255, 255, 0.055);
  box-shadow:
    inset 0 0 0 1px rgba(0, 230, 255, 0.84),
    inset 0 0 20px rgba(255, 255, 255, 0.04),
    0 0 24px rgba(0, 230, 255, 0.32),
    0 18px 38px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px) saturate(118%);
  -webkit-backdrop-filter: blur(18px) saturate(118%);
}

.axion-time-card::before {
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

.time-value,
.date-value {
  position: relative;
  z-index: 1;
}

.time-value {
  color: #f2f8fb;
  font-size: 20px;
  line-height: 1;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.date-value {
  margin-top: 9px;
  color: rgba(178, 199, 208, 0.82);
  font-size: 11px;
  line-height: 1.15;
}
</style>
