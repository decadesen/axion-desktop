<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import BackgroundLayer from "./components/BackgroundLayer.vue";
import CharacterStage from "./components/CharacterStage.vue";
import ConversationBubbleArea from "./components/ConversationBubbleArea.vue";
import LeftStatusPanel from "./components/LeftStatusPanel.vue";
import type {
  AssistantState,
  ConversationDisplayMode,
  ConversationMessage,
  NotificationItemData,
} from "./types";

withDefaults(
  defineProps<{
    currentTime: Date;
    assistantState: AssistantState;
    notifications: NotificationItemData[];
    messages: ConversationMessage[];
    userAvatarUrl?: string;
    assistantAvatarUrl: string;
    conversationDisplayMode?: ConversationDisplayMode;
    live2dModelUrl?: string;
    characterImageUrl?: string;
    voiceLevel?: number;
  }>(),
  {
    userAvatarUrl: "",
    conversationDisplayMode: "fade",
    voiceLevel: 0.36,
  },
);

const emit = defineEmits<{
  settingsClick: [];
  notificationClick: [notificationId: string];
  voiceStart: [];
  voiceStop: [];
  voiceClick: [];
  messageClick: [messageId: string];
  characterClick: [];
}>();

const viewport = ref({
  width: typeof window === "undefined" ? 1280 : window.innerWidth,
  height: typeof window === "undefined" ? 720 : window.innerHeight,
});

const updateViewport = () => {
  viewport.value = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const isDeviceCompact = computed(() => viewport.value.width <= 860 || viewport.value.height <= 520);
const maxNotifications = computed(() => (isDeviceCompact.value ? 2 : 3));
const maxVisibleMessages = computed(() => (isDeviceCompact.value ? 3 : 5));

onMounted(() => {
  updateViewport();
  window.addEventListener("resize", updateViewport);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateViewport);
});
</script>

<template>
  <main class="glenclaw-home-page" :class="`state-${assistantState}`">
    <BackgroundLayer :assistant-state="assistantState" />
    <LeftStatusPanel
      class="left-column"
      :current-time="currentTime"
      :notifications="notifications"
      :max-notifications="maxNotifications"
      @notification-click="emit('notificationClick', $event)"
      @settings-click="emit('settingsClick')"
    />
    <CharacterStage
      class="center-column"
      :assistant-state="assistantState"
      :live2d-model-url="live2dModelUrl"
      :character-image-url="characterImageUrl"
      :voice-level="voiceLevel"
      @character-click="emit('characterClick')"
      @voice-start="emit('voiceStart')"
      @voice-stop="emit('voiceStop')"
      @voice-click="emit('voiceClick')"
    />
    <ConversationBubbleArea
      class="right-column"
      :messages="messages"
      :max-visible="maxVisibleMessages"
      :mode="conversationDisplayMode"
      @message-click="emit('messageClick', $event)"
    />
  </main>
</template>

<style scoped>
.glenclaw-home-page {
  --bg-main: #050b14;
  --bg-panel: rgba(8, 20, 36, 0.72);
  --bg-panel-soft: rgba(10, 28, 48, 0.48);
  --text-primary: #f4f8ff;
  --text-secondary: #9fb3c8;
  --text-muted: #64758a;
  --accent-cyan: #18e7ff;
  --accent-blue: #1f8cff;
  --bubble-ai-bg: rgba(16, 142, 220, 0.46);
  --bubble-user-bg: rgba(16, 22, 34, 0.78);
  --border-cyan: rgba(24, 231, 255, 0.65);
  --border-soft: rgba(160, 200, 255, 0.24);
  --glow-cyan: 0 0 24px rgba(24, 231, 255, 0.45);

  position: relative;
  width: 100vw;
  height: 100vh;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(240px, 25%) minmax(320px, 1fr) minmax(360px, 35%);
  overflow: hidden;
  background: var(--bg-main);
  color: var(--text-primary);
  font-family:
    "Avenir Next",
    "Noto Sans SC",
    "Microsoft YaHei",
    "PingFang SC",
    sans-serif;
}

.left-column,
.center-column,
.right-column {
  min-width: 0;
}

.state-offline {
  filter: saturate(0.7);
}

@media (max-width: 1120px) {
  .glenclaw-home-page {
    grid-template-columns: minmax(220px, 27%) minmax(300px, 1fr) minmax(320px, 34%);
  }
}

@media (max-width: 1040px), (max-height: 620px) {
  .glenclaw-home-page {
    grid-template-columns: 220px minmax(240px, 1fr) 320px;
  }
}

@media (max-width: 860px), (max-height: 520px) {
  .glenclaw-home-page {
    grid-template-columns: 180px minmax(250px, 1fr) 270px;
  }
}
</style>
