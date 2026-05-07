<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import Live2DStage from "../../../components/Live2DStage.vue";
import { deriveCharacterState } from "../state";
import type { AssistantState, Live2DExpression, Live2DMotion } from "../types";

type Live2DStageExpose = {
  playMotionAlias: (alias: string) => void;
  setExpressionAlias: (alias: string) => void;
};

const props = defineProps<{
  modelUrl?: string;
  imageUrl?: string;
  state: AssistantState;
  expression?: Live2DExpression;
  motion?: Live2DMotion;
}>();

const emit = defineEmits<{
  click: [];
}>();

const stageRef = ref<Live2DStageExpose | null>(null);

const characterState = computed(() => deriveCharacterState(props.state));
const activeExpression = computed(() => props.expression ?? characterState.value.expression);
const activeMotion = computed(() => props.motion ?? characterState.value.motion);

const expressionAliasMap: Record<Live2DExpression, string> = {
  neutral: "neutral",
  smile: "smile",
  listening: "listening",
  thinking: "thinking",
  speaking: "happy",
};

const motionAliasMap: Record<Live2DMotion, string> = {
  idle: "mtn_01",
  listen: "mtn_01",
  think: "mtn_03",
  speak: "mtn_02",
};

const applyCharacterState = () => {
  if (typeof stageRef.value?.setExpressionAlias === "function") {
    stageRef.value.setExpressionAlias(expressionAliasMap[activeExpression.value]);
  }
  if (typeof stageRef.value?.playMotionAlias === "function") {
    stageRef.value.playMotionAlias(motionAliasMap[activeMotion.value]);
  }
};

watch([activeExpression, activeMotion], () => {
  applyCharacterState();
});

onMounted(async () => {
  await nextTick();
  applyCharacterState();
});
</script>

<template>
  <button class="live2d-character" :class="`state-${state}`" type="button" @click="emit('click')">
    <img v-if="imageUrl" :src="imageUrl" alt="Glenclaw character" />
    <Live2DStage
      v-else
      ref="stageRef"
      class="live2d-stage"
      :model-path="modelUrl"
      :speaking="state === 'replying'"
      :viseme="state === 'replying' ? 'a' : 'sil'"
    />
  </button>
</template>

<style scoped>
.live2d-character {
  position: relative;
  z-index: 2;
  width: min(100%, 520px);
  height: min(76vh, 760px);
  min-height: 360px;
  display: grid;
  place-items: center;
  padding: 0;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: 0;
  filter:
    drop-shadow(0 22px 52px rgba(0, 0, 0, 0.42))
    drop-shadow(0 0 28px rgba(24, 231, 255, 0.12));
  transition: filter 220ms ease, transform 220ms ease;
}

.live2d-character:hover {
  filter:
    drop-shadow(0 24px 58px rgba(0, 0, 0, 0.44))
    drop-shadow(0 0 36px rgba(24, 231, 255, 0.2));
}

.live2d-character.state-listening {
  transform: translateY(-1%) scale(1.02);
  filter:
    drop-shadow(0 24px 58px rgba(0, 0, 0, 0.42))
    drop-shadow(0 0 42px rgba(24, 231, 255, 0.25));
}

.live2d-character.state-replying {
  transform: translateY(-1.5%) scale(1.03);
  filter:
    drop-shadow(0 26px 60px rgba(0, 0, 0, 0.44))
    drop-shadow(0 0 46px rgba(24, 231, 255, 0.32));
}

.live2d-character.state-offline {
  filter: grayscale(0.45) brightness(0.72);
}

.live2d-stage {
  width: 100%;
  height: 100%;
}

img {
  width: auto;
  height: 100%;
  max-width: 100%;
  object-fit: contain;
}

@media (max-width: 1100px), (max-height: 650px) {
  .live2d-character {
    width: min(100%, 430px);
    height: min(74vh, 560px);
    min-height: 300px;
  }
}

@media (max-width: 860px), (max-height: 520px) {
  .live2d-character {
    width: min(100%, 260px);
    height: 340px;
    min-height: 260px;
  }
}
</style>
