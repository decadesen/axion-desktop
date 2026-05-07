<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    percentage?: number;
    status?: string;
    health?: number;
    cycles?: number;
    width?: number | string;
    height?: number | string;
  }>(),
  {
    percentage: 10,
    status: "Charging",
    health: 10,
    cycles: 215,
    width: 220,
    height: 220,
  },
);

const normalizeSize = (value: number | string) =>
  typeof value === "number" ? `${value}px` : value;
</script>

<template>
  <section
    class="battery-widget"
    :style="{ width: normalizeSize(width), height: normalizeSize(height) }"
  >
    <div class="glass-card">
      <div class="battery-info">
        <div class="battery-percentage">{{ percentage }}%</div>

        <div class="info-row">
          <span class="row-label">{{ status }}</span>
        </div>

        <div class="info-row">
          <span class="row-label">{{ health }}% battery health</span>
        </div>

        <div class="info-row">
          <span class="row-label">{{ cycles }} cycles</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.battery-widget {
  position: relative;
  display: grid;
  place-items: center;
}

.glass-card {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  border-radius: 26px;
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
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.045) 26%,
      rgba(255, 255, 255, 0.03) 100%
    ),
    rgba(255, 255, 255, 0.055);
  backdrop-filter: blur(14px) saturate(118%);
  -webkit-backdrop-filter: blur(14px) saturate(118%);
  box-shadow:
    inset 0 0 0 1px rgba(0, 230, 255, 0.84),
    inset 0 0 20px rgba(255, 255, 255, 0.04),
    0 0 24px rgba(0, 230, 255, 0.32),
    0 16px 32px rgba(0, 0, 0, 0.44);
  overflow: hidden;
}

.glass-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    linear-gradient(
      125deg,
      rgba(255, 255, 255, 0.18) 0%,
      rgba(8, 18, 22, 0.02) 46%,
      rgba(8, 18, 22, 0.22) 100%
    );
  background-size: 220% 220%;
  animation: sheen 14s ease-in-out infinite;
  filter: drop-shadow(0 0 14px rgba(0, 230, 255, 0.56));
}

.battery-info {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 13px;
  height: 100%;
  padding: 26px 24px;
  box-sizing: border-box;
  font-family: "Inter", "Segoe UI", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.battery-percentage {
  color: rgba(255, 255, 255, 0.98);
  font-size: 48px;
  line-height: 1;
  font-weight: 700;
  text-shadow: none;
}

.info-row {
  display: flex;
  align-items: center;
  min-height: 16px;
}

.row-label {
  color: rgba(0, 230, 255, 0.98);
  font-size: 11px;
  line-height: 1.2;
}

@keyframes sheen {
  0%,
  100% {
    background-position: 0 0;
  }

  50% {
    background-position: 100% 100%;
  }
}
</style>
