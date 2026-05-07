<script setup lang="ts">
import type { AssistantState } from "../types";

defineProps<{
  assistantState: AssistantState;
}>();
</script>

<template>
  <div class="background-layer" :class="`state-${assistantState}`" aria-hidden="true">
    <div class="nebula nebula-left"></div>
    <div class="nebula nebula-right"></div>
    <div class="stellar-field"></div>
    <div class="orbit orbit-wide"></div>
    <div class="orbit orbit-mid"></div>
    <div class="scanline"></div>
  </div>
</template>

<style scoped>
.background-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 52%, rgba(0, 134, 214, 0.22), transparent 32%),
    radial-gradient(circle at 48% 26%, rgba(20, 231, 255, 0.12), transparent 28%),
    radial-gradient(circle at 82% 46%, rgba(16, 87, 161, 0.22), transparent 32%),
    linear-gradient(180deg, #030711 0%, #061021 46%, #020813 100%);
}

.background-layer::before,
.background-layer::after,
.stellar-field {
  content: "";
  position: absolute;
  inset: -12%;
  background-image:
    radial-gradient(circle, rgba(24, 231, 255, 0.9) 0 1px, transparent 1.6px),
    radial-gradient(circle, rgba(31, 140, 255, 0.72) 0 1px, transparent 1.5px);
  background-size: 54px 54px, 91px 91px;
  opacity: 0.28;
  mask-image: radial-gradient(ellipse at 50% 50%, #000 0 48%, transparent 72%);
  animation: drift 22s linear infinite;
}

.background-layer::after {
  opacity: 0.2;
  transform: rotate(18deg) scale(1.12);
  animation-duration: 36s;
}

.stellar-field {
  inset: 0;
  opacity: 0.18;
  background-size: 28px 28px, 44px 44px;
  animation-duration: 16s;
}

.nebula {
  position: absolute;
  border-radius: 999px;
  filter: blur(28px);
  pointer-events: none;
}

.nebula-left {
  width: 42vw;
  height: 54vh;
  left: -16vw;
  top: 16vh;
  background: radial-gradient(circle, rgba(18, 109, 197, 0.22), transparent 68%);
}

.nebula-right {
  width: 38vw;
  height: 48vh;
  right: -12vw;
  top: 12vh;
  background: radial-gradient(circle, rgba(24, 231, 255, 0.16), transparent 70%);
}

.orbit {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  transform: translate(-50%, -50%) rotateX(68deg);
  border: 1px solid rgba(24, 231, 255, 0.14);
  box-shadow:
    0 0 42px rgba(24, 231, 255, 0.08),
    inset 0 0 38px rgba(31, 140, 255, 0.04);
}

.orbit-wide {
  width: min(50vw, 700px);
  height: min(50vw, 700px);
  animation: slow-spin 28s linear infinite;
}

.orbit-mid {
  width: min(34vw, 460px);
  height: min(34vw, 460px);
  opacity: 0.72;
  animation: slow-spin 20s linear infinite reverse;
}

.scanline {
  position: absolute;
  left: 26%;
  right: 24%;
  bottom: 9%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(24, 231, 255, 0.55), transparent);
  box-shadow: 0 0 22px rgba(24, 231, 255, 0.32);
}

.state-listening .orbit,
.state-replying .orbit {
  border-color: rgba(24, 231, 255, 0.3);
  box-shadow:
    0 0 54px rgba(24, 231, 255, 0.2),
    inset 0 0 48px rgba(31, 140, 255, 0.08);
}

.state-thinking .orbit {
  animation-duration: 12s;
}

.state-offline {
  filter: saturate(0.5) brightness(0.72);
}

.state-error {
  background:
    radial-gradient(circle at 50% 52%, rgba(0, 134, 214, 0.18), transparent 32%),
    radial-gradient(circle at 92% 50%, rgba(255, 61, 93, 0.12), transparent 24%),
    linear-gradient(180deg, #030711 0%, #061021 46%, #020813 100%);
}

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-54px, 54px, 0);
  }
}

@keyframes slow-spin {
  from {
    transform: translate(-50%, -50%) rotateX(68deg) rotateZ(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotateX(68deg) rotateZ(360deg);
  }
}
</style>
