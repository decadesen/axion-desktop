<script setup lang="ts">
import { computed } from "vue";
import { assistantStateLabels } from "../state";
import type { AssistantState } from "../types";

const props = withDefaults(
  defineProps<{
    state: AssistantState;
    level?: number;
    label?: string;
    disabled?: boolean;
  }>(),
  {
    level: 0.36,
    disabled: false,
  },
);

const emit = defineEmits<{
  start: [];
  stop: [];
  click: [];
}>();

const statusLabel = computed(() => props.label ?? assistantStateLabels[props.state]);

const waveBars = computed(() => {
  const base = props.state === "standby" ? 0.22 : props.state === "thinking" ? 0.42 : 0.72;
  return Array.from({ length: 34 }, (_, index) => {
    const rhythm = Math.sin(index * 1.7) * 0.5 + 0.5;
    const centerBias = 1 - Math.abs(index - 16.5) / 19;
    return Math.max(0.12, (base + props.level * rhythm) * centerBias);
  });
});
</script>

<template>
  <button
    class="voice-indicator"
    :class="`state-${state}`"
    type="button"
    :disabled="disabled"
    @click="emit('click')"
    @pointerdown="emit('start')"
    @pointerup="emit('stop')"
    @pointerleave="emit('stop')"
  >
    <span class="wave" aria-hidden="true">
      <i
        v-for="(bar, index) in waveBars"
        :key="index"
        :style="{ '--bar-scale': String(bar), '--bar-delay': `${index * 34}ms` }"
      ></i>
    </span>
    <span class="microphone" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M12 3.5a3.6 3.6 0 0 0-3.6 3.6v4.8a3.6 3.6 0 1 0 7.2 0V7.1A3.6 3.6 0 0 0 12 3.5z" />
        <path d="M5.8 11.4a6.2 6.2 0 0 0 12.4 0M12 17.7v3.2M8.8 20.9h6.4" />
      </svg>
    </span>
    <span class="voice-label">{{ statusLabel }}</span>
  </button>
</template>

<style scoped>
.voice-indicator {
  position: relative;
  z-index: 4;
  width: min(92%, 560px);
  min-height: clamp(54px, 8vh, 86px);
  display: grid;
  grid-template-columns: 1fr clamp(38px, 5vw, 64px) 1fr;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 2px 12px;
  padding: 0;
  color: #18e7ff;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.voice-indicator:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.wave {
  grid-column: 1 / 4;
  grid-row: 1;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  overflow: hidden;
}

.wave::before,
.wave::after {
  content: "";
  width: 28%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(24, 231, 255, 0.55));
  box-shadow: 0 0 16px rgba(24, 231, 255, 0.38);
}

.wave::after {
  background: linear-gradient(90deg, rgba(24, 231, 255, 0.55), transparent);
}

.wave i {
  width: 3px;
  height: calc(28px * var(--bar-scale));
  min-height: 2px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 10px rgba(24, 231, 255, 0.7);
  animation: wave-pulse 980ms ease-in-out infinite;
  animation-delay: var(--bar-delay);
}

.state-standby .wave i {
  animation-duration: 1800ms;
  opacity: 0.62;
}

.state-thinking .wave i {
  animation-duration: 1350ms;
}

.state-replying .wave i,
.state-listening .wave i {
  animation-duration: 760ms;
}

.state-offline {
  color: #64758a;
}

.state-error {
  color: #ff8a9e;
}

.microphone {
  grid-column: 2;
  grid-row: 1 / 3;
  justify-self: center;
  width: clamp(38px, 5vw, 64px);
  height: clamp(38px, 5vw, 64px);
  display: grid;
  place-items: center;
  filter: drop-shadow(0 0 18px rgba(24, 231, 255, 0.7));
}

svg {
  width: 88%;
  height: 88%;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.voice-label {
  grid-column: 1 / 4;
  grid-row: 2;
  justify-self: center;
  color: currentColor;
  font-size: clamp(16px, 1.8vw, 22px);
  line-height: 1;
  text-shadow: 0 0 14px rgba(24, 231, 255, 0.62);
}

@keyframes wave-pulse {
  0%,
  100% {
    transform: scaleY(0.58);
  }
  50% {
    transform: scaleY(1.18);
  }
}

@media (max-width: 860px), (max-height: 520px) {
  .voice-indicator {
    width: 94%;
    min-height: 42px;
    grid-template-columns: 1fr 34px 1fr;
    gap: 0 8px;
  }

  .wave {
    height: 24px;
    gap: 2px;
  }

  .wave i {
    width: 2px;
    height: calc(18px * var(--bar-scale));
  }

  .microphone {
    width: 34px;
    height: 34px;
  }

  .voice-label {
    font-size: 13px;
  }
}
</style>
