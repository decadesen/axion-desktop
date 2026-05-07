<script setup lang="ts">
import { computed } from "vue";
import { getVisibleNotifications } from "../state";
import type { NotificationItemData } from "../types";
import NotificationItem from "./NotificationItem.vue";

const props = withDefaults(
  defineProps<{
    notifications: NotificationItemData[];
    maxItems?: number;
  }>(),
  {
    maxItems: 3,
  },
);

const emit = defineEmits<{
  itemClick: [id: string];
}>();

const visibleNotifications = computed(() =>
  getVisibleNotifications(props.notifications, props.maxItems),
);
</script>

<template>
  <section class="notification-list" aria-label="Notifications">
    <header>
      <span>NOTIFICATIONS</span>
      <i></i>
    </header>
    <div class="notification-stack">
      <NotificationItem
        v-for="item in visibleNotifications"
        :key="item.id"
        :item="item"
        @click="emit('itemClick', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.notification-list {
  display: grid;
  gap: clamp(12px, 2vh, 24px);
}

header {
  display: flex;
  align-items: center;
  gap: 13px;
  padding-left: 18px;
}

header span {
  color: #18e7ff;
  font-size: clamp(14px, 1.4vw, 18px);
  line-height: 1;
  text-shadow: 0 0 14px rgba(24, 231, 255, 0.4);
}

header i {
  width: min(112px, 38%);
  height: 1px;
  background: linear-gradient(90deg, #18e7ff, rgba(24, 231, 255, 0));
}

header i::before {
  content: "";
  display: block;
  width: 10px;
  height: 10px;
  margin-top: -4px;
  border-radius: 50%;
  background: #18e7ff;
  box-shadow: 0 0 14px rgba(24, 231, 255, 0.9);
}

.notification-stack {
  display: grid;
  gap: clamp(12px, 2.4vh, 24px);
}

@media (max-width: 860px), (max-height: 520px) {
  .notification-list {
    gap: 8px;
  }

  header {
    gap: 8px;
    padding-left: 8px;
  }

  header span {
    font-size: 11px;
  }

  header i {
    width: 56px;
  }

  .notification-stack {
    gap: 8px;
  }
}
</style>
