<script setup lang="ts">
import type { ConversationDisplayMode, ConversationMessage } from "../types";
import ConversationFadeList from "./ConversationFadeList.vue";
import ConversationWheelList from "./ConversationWheelList.vue";

const props = withDefaults(
  defineProps<{
    messages: ConversationMessage[];
    maxVisible?: number;
    mode?: ConversationDisplayMode;
  }>(),
  {
    maxVisible: 7,
    mode: "fade",
  },
);

const emit = defineEmits<{
  messageClick: [id: string];
}>();
</script>

<template>
  <section class="conversation-bubble-area" aria-label="Recent conversation">
    <ConversationFadeList
      v-if="props.mode === 'fade'"
      :messages="props.messages"
      :max-visible="props.maxVisible"
      @message-click="emit('messageClick', $event)"
    />
    <ConversationWheelList
      v-else
      :messages="props.messages"
      @message-click="emit('messageClick', $event)"
    />
  </section>
</template>

<style scoped>
.conversation-bubble-area {
  position: relative;
  z-index: 1;
  height: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  padding: clamp(14px, 3vh, 34px) clamp(14px, 1.6vw, 26px) clamp(14px, 3vh, 34px) 0;
  overflow: hidden;
}

@media (max-width: 1100px), (max-height: 650px) {
  .conversation-bubble-area {
    padding-block: 18px;
    padding-right: 18px;
  }

  .bubble-stack {
    gap: 12px;
  }
}

@media (max-width: 860px), (max-height: 520px) {
  .conversation-bubble-area {
    padding: 10px 8px 10px 0;
  }
}
</style>
