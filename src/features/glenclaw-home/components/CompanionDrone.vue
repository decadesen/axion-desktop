<script setup lang="ts">
import type { AssistantState } from "../types";

withDefaults(
  defineProps<{
    visible?: boolean;
    state: AssistantState;
  }>(),
  {
    visible: true,
  },
);
</script>

<template>
  <div v-if="visible" class="companion-drone" :class="`state-${state}`" aria-label="Companion drone">
    <span class="ear ear-left"></span>
    <span class="ear ear-right"></span>
    <span class="drone-face">
      <i></i>
      <i></i>
    </span>
  </div>
</template>

<style scoped>
.companion-drone {
  position: absolute;
  z-index: 3;
  top: 18%;
  right: 10%;
  width: clamp(56px, 7vw, 104px);
  height: clamp(48px, 6vw, 88px);
  display: grid;
  place-items: center;
  filter: drop-shadow(0 0 28px rgba(24, 231, 255, 0.3));
  animation: drone-float 4.6s ease-in-out infinite;
}

.ear,
.drone-face {
  border: 1px solid rgba(183, 220, 255, 0.72);
  background:
    radial-gradient(circle at 50% 38%, rgba(255, 255, 255, 0.92), transparent 16%),
    linear-gradient(145deg, rgba(224, 235, 248, 0.92), rgba(56, 79, 104, 0.92));
}

.ear {
  position: absolute;
  width: 28%;
  height: 36%;
  border-radius: 50%;
}

.ear-left {
  left: 0;
  top: 28%;
}

.ear-right {
  right: 0;
  top: 24%;
}

.drone-face {
  position: relative;
  width: 62%;
  height: 74%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14%;
  border-radius: 50%;
  box-shadow:
    inset 0 -10px 18px rgba(0, 0, 0, 0.42),
    0 0 24px rgba(24, 231, 255, 0.2);
}

.drone-face i {
  width: 14%;
  height: 24%;
  border-radius: 999px;
  background: #18e7ff;
  box-shadow: 0 0 14px rgba(24, 231, 255, 0.96);
}

.state-listening .drone-face i,
.state-replying .drone-face i {
  box-shadow: 0 0 22px rgba(24, 231, 255, 1);
}

.state-thinking {
  animation-duration: 2.8s;
}

.state-offline {
  filter: grayscale(0.7) brightness(0.58);
}

@keyframes drone-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0) rotate(-3deg);
  }
  50% {
    transform: translate3d(0, -10px, 0) rotate(4deg);
  }
}

@media (max-width: 860px), (max-height: 520px) {
  .companion-drone {
    top: 18%;
    right: 0;
    width: 48px;
    height: 42px;
  }
}
</style>
