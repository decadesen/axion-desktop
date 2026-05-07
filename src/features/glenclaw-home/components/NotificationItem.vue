<script setup lang="ts">
import type { NotificationItemData } from "../types";

const props = defineProps<{
  item: NotificationItemData;
}>();

const emit = defineEmits<{
  click: [id: string];
}>();

const handleClick = () => {
  emit("click", props.item.id);
};
</script>

<template>
  <button class="notification-item" type="button" @click="handleClick">
    <span class="notification-icon" :class="`type-${item.type}`" aria-hidden="true">
      <svg v-if="item.type === 'message'" viewBox="0 0 24 24">
        <path d="M3.5 6.8h17v10.4h-17z" />
        <path d="m4.2 7.3 7.8 6.2 7.8-6.2" />
      </svg>
      <svg v-else-if="item.type === 'schedule'" viewBox="0 0 24 24">
        <path d="M5 6.5h14v13H5z" />
        <path d="M8 4v4M16 4v4M5 10h14M8.5 13.5h2M13.5 13.5h2M8.5 16.5h2" />
      </svg>
      <svg v-else-if="item.type === 'weather'" viewBox="0 0 24 24">
        <path d="M7.5 18h10a4 4 0 0 0 .2-8 5.8 5.8 0 0 0-11.1 1.5A3.3 3.3 0 0 0 7.5 18z" />
      </svg>
      <svg v-else-if="item.type === 'warning'" viewBox="0 0 24 24">
        <path d="m12 4 8.5 15h-17z" />
        <path d="M12 9v4M12 16.8v.2" />
      </svg>
      <svg v-else viewBox="0 0 24 24">
        <path d="M9 3h6v3h3v6h3v6h-3v3h-6v-3H6v-6H3V6h6z" />
        <path d="M9 9h6v6H9z" />
      </svg>
    </span>

    <span class="notification-copy">
      <span class="notification-title">{{ item.title }}</span>
      <span v-if="item.description" class="notification-description">{{ item.description }}</span>
    </span>

    <time>{{ item.time }}</time>
    <span v-if="item.unread" class="unread-dot" aria-label="Unread"></span>
  </button>
</template>

<style scoped>
.notification-item {
  width: 100%;
  min-height: clamp(78px, 12vh, 116px);
  display: grid;
  grid-template-columns: clamp(44px, 5vw, 62px) minmax(0, 1fr) auto;
  grid-template-rows: 1fr auto;
  column-gap: clamp(12px, 1.8vw, 20px);
  align-items: center;
  padding: clamp(12px, 1.7vw, 20px);
  border: 1px solid rgba(127, 170, 211, 0.16);
  border-radius: clamp(16px, 2vw, 24px);
  color: #f4f8ff;
  text-align: left;
  cursor: pointer;
  background:
    radial-gradient(110px 70px at 12% 18%, rgba(20, 112, 199, 0.2), transparent 68%),
    linear-gradient(180deg, rgba(9, 24, 42, 0.76), rgba(4, 12, 22, 0.78));
  box-shadow:
    0 18px 50px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.notification-item:hover {
  border-color: rgba(24, 231, 255, 0.46);
  filter: brightness(1.08);
}

.notification-icon {
  grid-row: 1 / 3;
  width: clamp(44px, 5vw, 62px);
  height: clamp(44px, 5vw, 62px);
  display: grid;
  place-items: center;
  border: 1px solid rgba(24, 231, 255, 0.24);
  border-radius: 12px;
  background:
    radial-gradient(circle at 50% 18%, rgba(112, 181, 255, 0.34), transparent 46%),
    linear-gradient(145deg, rgba(0, 96, 174, 0.86), rgba(3, 38, 76, 0.92));
  box-shadow: 0 0 24px rgba(31, 140, 255, 0.18);
}

svg {
  width: 62%;
  height: 62%;
  fill: none;
  stroke: #ddecff;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.type-weather svg path:first-child,
.type-warning svg path:first-child {
  fill: rgba(221, 236, 255, 0.92);
}

.notification-copy {
  min-width: 0;
  display: grid;
  gap: 7px;
}

.notification-title {
  overflow: hidden;
  color: rgba(250, 253, 255, 0.96);
  font-size: clamp(15px, 1.6vw, 21px);
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-description {
  display: -webkit-box;
  overflow: hidden;
  color: rgba(220, 231, 244, 0.78);
  font-size: clamp(12px, 1.2vw, 16px);
  line-height: 1.2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

time {
  align-self: start;
  color: rgba(232, 240, 255, 0.84);
  font-size: clamp(12px, 1.2vw, 16px);
}

.unread-dot {
  grid-column: 3;
  align-self: end;
  justify-self: end;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #18e7ff;
  box-shadow: 0 0 16px rgba(24, 231, 255, 0.9);
}

@media (max-width: 860px), (max-height: 520px) {
  .notification-item {
    min-height: 58px;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    column-gap: 8px;
    padding: 8px;
    border-radius: 14px;
  }

  .notification-icon {
    width: 34px;
    height: 34px;
    border-radius: 9px;
  }

  .notification-copy {
    gap: 3px;
  }

  .notification-title {
    font-size: 12px;
  }

  .notification-description {
    font-size: 10px;
    -webkit-line-clamp: 1;
  }

  time {
    font-size: 10px;
  }

  .unread-dot {
    width: 7px;
    height: 7px;
  }
}
</style>
