<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import GlenclawHomePage from "../features/glenclaw-home/GlenclawHomePage.vue";
import {
  glenclawAssistantAvatar,
  mockMessages,
  mockNotifications,
  mockUserAvatar,
} from "../features/glenclaw-home/mockData";
import { conversationDisplayMode } from "../features/glenclaw-home/preferences";
import type { AssistantState } from "../features/glenclaw-home/types";

const router = useRouter();
const currentTime = ref(new Date("2026-04-24T09:32:00"));
const assistantState = ref<AssistantState>("standby");
const voiceLevel = ref(0.34);

let clockTimer: number | undefined;

const rotateAssistantState = () => {
  const flow: AssistantState[] = ["standby", "listening", "replying"];
  const currentIndex = flow.indexOf(assistantState.value);
  assistantState.value = flow[(currentIndex + 1) % flow.length];
  voiceLevel.value = assistantState.value === "standby" ? 0.24 : assistantState.value === "listening" ? 0.9 : 0.62;
};

onMounted(() => {
  clockTimer = window.setInterval(() => {
    currentTime.value = new Date(currentTime.value.getTime() + 60_000);
  }, 60_000);
});

onBeforeUnmount(() => {
  if (clockTimer) {
    window.clearInterval(clockTimer);
  }
});
</script>

<template>
  <GlenclawHomePage
    :current-time="currentTime"
    :assistant-state="assistantState"
    :notifications="mockNotifications"
    :messages="mockMessages"
    :assistant-avatar-url="glenclawAssistantAvatar"
    :user-avatar-url="mockUserAvatar"
    :conversation-display-mode="conversationDisplayMode"
    :voice-level="voiceLevel"
    @settings-click="router.push({ name: 'settings' })"
    @voice-start="assistantState = 'listening'"
    @voice-stop="assistantState = 'replying'"
    @voice-click="rotateAssistantState"
    @character-click="rotateAssistantState"
  />
</template>
