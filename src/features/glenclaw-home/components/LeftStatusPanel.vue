<script setup lang="ts">
import type { NotificationItemData } from "../types";
import NotificationList from "./NotificationList.vue";
import SettingsButton from "./SettingsButton.vue";
import TimeCard from "./TimeCard.vue";

withDefaults(
  defineProps<{
    currentTime: Date;
    notifications: NotificationItemData[];
    maxNotifications?: number;
  }>(),
  {
    maxNotifications: 3,
  },
);

const emit = defineEmits<{
  notificationClick: [id: string];
  settingsClick: [];
}>();
</script>

<template>
  <aside class="left-status-panel">
    <TimeCard :time="currentTime" />
    <NotificationList
      :notifications="notifications"
      :max-items="maxNotifications"
      @item-click="emit('notificationClick', $event)"
    />
    <SettingsButton @click="emit('settingsClick')" />
  </aside>
</template>

<style scoped>
.left-status-panel {
  position: relative;
  z-index: 1;
  height: 100%;
  min-width: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: clamp(14px, 2.5vh, 32px);
  padding: clamp(18px, 4.5vh, 56px) clamp(14px, 2vw, 32px);
}

@media (max-height: 650px) {
  .left-status-panel {
    gap: 14px;
    padding-block: 20px;
  }
}

@media (max-width: 860px), (max-height: 520px) {
  .left-status-panel {
    gap: 8px;
    padding: 10px 8px;
  }
}
</style>
