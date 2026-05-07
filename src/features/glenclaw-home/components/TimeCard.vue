<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    time: Date;
    format?: "24h" | "12h";
    showDate?: boolean;
  }>(),
  {
    format: "24h",
    showDate: true,
  },
);

const timeText = computed(() =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: props.format === "12h",
  }).format(props.time),
);

const dateText = computed(() =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    weekday: "short",
  })
    .format(props.time)
    .replace(",", " ·")
    .toUpperCase(),
);
</script>

<template>
  <article class="time-card" aria-label="Current time">
    <div class="time-row">
      <strong>{{ timeText }}</strong>
      <span class="status-dot"></span>
    </div>
    <p v-if="showDate">{{ dateText }}</p>
  </article>
</template>

<style scoped>
.time-card {
  position: relative;
  min-height: var(--ax-time-card-min-height);
  padding: var(--ax-panel-padding);
  border: 1px solid rgba(137, 191, 230, 0.42);
  border-right-color: rgba(24, 231, 255, 0.64);
  border-radius: var(--ax-panel-radius) calc(var(--ax-panel-radius) + 6px) calc(var(--ax-panel-radius) + 24px)
    calc(var(--ax-panel-radius) + 6px);
  background:
    radial-gradient(220px 120px at 16% 0%, rgba(118, 178, 238, 0.16), transparent 70%),
    linear-gradient(180deg, rgba(4, 12, 25, 0.88), rgba(3, 11, 20, 0.7));
  box-shadow:
    0 0 34px rgba(24, 231, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
}

.time-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.time-row strong {
  color: #f7fbff;
  font-size: var(--ax-time-font);
  font-weight: 300;
  line-height: 0.92;
  letter-spacing: -0.08em;
  text-shadow: 0 0 22px rgba(199, 229, 255, 0.52);
}

.status-dot {
  width: clamp(10px, 1.4vw, 16px);
  height: clamp(10px, 1.4vw, 16px);
  border-radius: 50%;
  background: #18e7ff;
  box-shadow: 0 0 22px rgba(24, 231, 255, 0.95);
}

p {
  margin: 10px 0 0;
  color: rgba(235, 242, 255, 0.68);
  font-size: var(--ax-date-font);
  font-weight: 400;
  letter-spacing: -0.04em;
}

@media (max-width: 860px), (max-height: 520px) {
  .time-card {
    min-height: var(--ax-time-card-min-height);
    padding: var(--ax-panel-padding);
    border-radius: var(--ax-panel-radius);
  }

  .time-row {
    gap: 8px;
  }

  .time-row strong {
    letter-spacing: -0.07em;
  }

  .status-dot {
    width: 9px;
    height: 9px;
  }

  p {
    margin-top: 5px;
  }
}
</style>
