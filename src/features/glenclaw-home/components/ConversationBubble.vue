<script setup lang="ts">
import type { ConversationMessage } from "../types";

const props = defineProps<{
  message: ConversationMessage;
  avatarUrl: string;
  isAssistant: boolean;
}>();

const emit = defineEmits<{
  click: [id: string];
}>();

const handleClick = () => {
  emit("click", props.message.id);
};
</script>

<template>
  <article class="conversation-row" :class="{ assistant: isAssistant, user: !isAssistant }">
    <button class="conversation-bubble" type="button" @click="handleClick">
      <span v-if="isAssistant" class="spark" aria-hidden="true"></span>
      <span class="message-content">{{ message.content }}</span>
      <span class="message-footer">
        <span v-if="message.audioWave" class="mini-wave" aria-hidden="true">
          <i v-for="index in 18" :key="index"></i>
        </span>
        <time>{{ message.time }}</time>
      </span>
      <span v-if="message.status === 'error'" class="message-error">Failed</span>
    </button>
    <img class="avatar" :src="avatarUrl" :alt="isAssistant ? 'Glenclaw avatar' : 'User avatar'" />
  </article>
</template>

<style scoped>
.conversation-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(54px, 5vw, 76px);
  gap: clamp(12px, 1.4vw, 18px);
  align-items: center;
}

.conversation-bubble {
  position: relative;
  min-height: clamp(72px, 10vh, 126px);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: 1fr auto;
  gap: 8px 12px;
  padding: clamp(14px, 1.8vw, 24px) clamp(16px, 2vw, 28px);
  border-radius: 22px 22px 4px 22px;
  text-align: left;
  cursor: pointer;
  color: #f5f9ff;
  border: 1px solid rgba(150, 178, 215, 0.46);
  background:
    radial-gradient(170px 90px at 18% 0%, rgba(255, 255, 255, 0.08), transparent 66%),
    linear-gradient(180deg, rgba(12, 16, 25, 0.88), rgba(6, 10, 18, 0.88));
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.conversation-bubble::after {
  content: "";
  position: absolute;
  right: -15px;
  top: 50%;
  width: 22px;
  height: 22px;
  border-top: 1px solid currentColor;
  border-right: 1px solid currentColor;
  background: inherit;
  transform: translateY(-50%) rotate(45deg);
  color: rgba(150, 178, 215, 0.58);
}

.assistant .conversation-bubble {
  border-color: rgba(94, 205, 255, 0.96);
  background:
    radial-gradient(200px 130px at 16% 0%, rgba(41, 196, 255, 0.4), transparent 68%),
    linear-gradient(180deg, rgba(5, 113, 188, 0.9), rgba(5, 72, 142, 0.9));
  box-shadow:
    0 0 26px rgba(24, 231, 255, 0.48),
    0 18px 52px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.assistant .conversation-bubble::after {
  color: rgba(94, 205, 255, 0.98);
}

.message-content {
  grid-column: 2;
  color: rgba(249, 252, 255, 0.96);
  font-size: clamp(16px, 1.75vw, 25px);
  line-height: 1.45;
}

.spark {
  grid-column: 1;
  width: clamp(14px, 1.5vw, 24px);
  height: clamp(14px, 1.5vw, 24px);
  margin-top: 4px;
  background: #18e7ff;
  clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
  filter: drop-shadow(0 0 12px rgba(24, 231, 255, 0.95));
}

.user .message-content {
  grid-column: 1 / 3;
}

.message-footer {
  grid-column: 1 / 3;
  display: flex;
  align-items: end;
  justify-content: flex-end;
  gap: 12px;
}

time {
  color: rgba(234, 240, 255, 0.86);
  font-size: clamp(12px, 1.1vw, 16px);
}

.avatar {
  position: relative;
  z-index: 2;
  width: clamp(54px, 5vw, 76px);
  height: clamp(54px, 5vw, 76px);
  object-fit: cover;
  border-radius: 50%;
  border: 1px solid rgba(24, 231, 255, 0.68);
  box-shadow: 0 0 24px rgba(24, 231, 255, 0.28);
}

.mini-wave {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 26px;
  color: #f4fbff;
}

.mini-wave i {
  width: 3px;
  height: 18px;
  border-radius: 999px;
  background: currentColor;
  transform: scaleY(0.35);
  animation: mini-wave 760ms ease-in-out infinite;
}

.mini-wave i:nth-child(2n) {
  animation-delay: 90ms;
}

.mini-wave i:nth-child(3n) {
  animation-delay: 180ms;
}

.message-error {
  grid-column: 1 / 3;
  justify-self: end;
  color: #ff8a9e;
  font-size: 12px;
}

@keyframes mini-wave {
  0%,
  100% {
    transform: scaleY(0.32);
  }
  50% {
    transform: scaleY(1);
  }
}

@media (max-width: 860px), (max-height: 520px) {
  .conversation-row {
    grid-template-columns: minmax(0, 1fr) 42px;
    gap: 8px;
  }

  .conversation-bubble {
    min-height: 58px;
    gap: 5px 7px;
    padding: 10px 12px;
    border-radius: 16px 16px 4px 16px;
  }

  .conversation-bubble::after {
    right: -10px;
    width: 15px;
    height: 15px;
  }

  .message-content {
    display: -webkit-box;
    overflow: hidden;
    font-size: 12px;
    line-height: 1.32;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .spark {
    width: 12px;
    height: 12px;
    margin-top: 2px;
  }

  .message-footer {
    gap: 6px;
  }

  time {
    font-size: 10px;
  }

  .avatar {
    width: 42px;
    height: 42px;
  }

  .mini-wave {
    height: 16px;
    gap: 2px;
  }

  .mini-wave i {
    width: 2px;
    height: 12px;
  }
}
</style>
