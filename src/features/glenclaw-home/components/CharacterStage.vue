<script setup lang="ts">
import { computed } from "vue";
import { deriveCharacterState } from "../state";
import type { AssistantState } from "../types";
import CompanionDrone from "./CompanionDrone.vue";
import Live2DCharacter from "./Live2DCharacter.vue";
import VoiceInputIndicator from "./VoiceInputIndicator.vue";

const props = withDefaults(
  defineProps<{
    assistantState: AssistantState;
    live2dModelUrl?: string;
    characterImageUrl?: string;
    showDrone?: boolean;
    voiceLevel?: number;
  }>(),
  {
    showDrone: true,
    voiceLevel: 0.36,
  },
);

const emit = defineEmits<{
  characterClick: [];
  voiceStart: [];
  voiceStop: [];
  voiceClick: [];
}>();

const characterState = computed(() => deriveCharacterState(props.assistantState));
</script>

<template>
  <section class="character-stage" :class="`state-${assistantState}`" aria-label="Glenclaw character stage">
    <div class="stage-glow"></div>
    <div class="floor-ring"></div>
    <Live2DCharacter
      :model-url="live2dModelUrl"
      :image-url="characterImageUrl"
      :state="assistantState"
      :expression="characterState.expression"
      :motion="characterState.motion"
      @click="emit('characterClick')"
    />
    <CompanionDrone :visible="showDrone" :state="assistantState" />
    <VoiceInputIndicator
      :state="assistantState"
      :level="voiceLevel"
      @start="emit('voiceStart')"
      @stop="emit('voiceStop')"
      @click="emit('voiceClick')"
    />
  </section>
</template>

<style scoped>
.character-stage {
  position: relative;
  z-index: 1;
  min-width: 0;
  height: 100%;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  place-items: center;
  padding: var(--ax-page-padding) 0 var(--ax-panel-padding);
}

.stage-glow,
.floor-ring {
  position: absolute;
  pointer-events: none;
}

.stage-glow {
  width: var(--ax-stage-glow-size);
  height: var(--ax-stage-glow-size);
  top: 12%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(24, 231, 255, 0.1), transparent 62%);
  box-shadow: inset 0 0 80px rgba(24, 231, 255, 0.04);
}

.floor-ring {
  width: var(--ax-floor-ring-width);
  height: var(--ax-floor-ring-height);
  bottom: var(--ax-floor-ring-bottom);
  border-radius: 50%;
  border: 1px solid rgba(24, 231, 255, 0.22);
  background:
    radial-gradient(ellipse at 50% 50%, rgba(24, 231, 255, 0.18), transparent 58%),
    repeating-radial-gradient(ellipse at 50% 50%, rgba(24, 231, 255, 0.26) 0 1px, transparent 2px 12px);
  filter: blur(0.2px);
  transform: perspective(360px) rotateX(64deg);
  box-shadow: 0 0 36px rgba(24, 231, 255, 0.24);
}

.state-listening .stage-glow,
.state-replying .stage-glow {
  background: radial-gradient(circle, rgba(24, 231, 255, 0.18), transparent 64%);
}

.state-replying .floor-ring {
  box-shadow: 0 0 52px rgba(24, 231, 255, 0.36);
}

@media (max-width: 1100px), (max-height: 650px) {
  .character-stage {
    padding-top: 2px;
    padding-bottom: var(--ax-panel-gap);
  }

  .floor-ring {
    bottom: var(--ax-floor-ring-bottom);
  }
}

@media (max-width: 860px), (max-height: 520px) {
  .character-stage {
    padding-top: 2px;
    padding-bottom: var(--ax-panel-gap);
  }

  .stage-glow {
    width: var(--ax-stage-glow-size);
    height: var(--ax-stage-glow-size);
    top: 12%;
  }

  .floor-ring {
    width: var(--ax-floor-ring-width);
    height: var(--ax-floor-ring-height);
    bottom: var(--ax-floor-ring-bottom);
  }
}
</style>
