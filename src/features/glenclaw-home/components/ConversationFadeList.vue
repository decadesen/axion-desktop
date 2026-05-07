<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import type { ConversationMessage } from "../types";

const props = withDefaults(
  defineProps<{
    messages: ConversationMessage[];
    maxVisible?: number;
  }>(),
  {
    maxVisible: 7,
  },
);

const emit = defineEmits<{
  messageClick: [id: string];
}>();

const listRef = ref<HTMLElement | null>(null);
const hasTopContent = ref(false);
const hasBottomContent = ref(false);
const isDragging = ref(false);
const didDrag = ref(false);
const dragStartY = ref(0);
const dragStartScrollTop = ref(0);
const activeTouchId = ref<number | null>(null);

const updateFadeEdges = () => {
  const element = listRef.value;
  if (!element) {
    return;
  }

  hasTopContent.value = element.scrollTop > 4;
  hasBottomContent.value = element.scrollTop + element.clientHeight < element.scrollHeight - 4;
};

const scrollToLatest = async () => {
  await nextTick();
  const element = listRef.value;
  if (!element) {
    return;
  }

  element.scrollTop = element.scrollHeight;
  updateFadeEdges();
};

const beginDrag = (clientY: number) => {
  const element = listRef.value;
  if (!element) {
    return;
  }

  isDragging.value = true;
  didDrag.value = false;
  dragStartY.value = clientY;
  dragStartScrollTop.value = element.scrollTop;
};

const moveDrag = (clientY: number) => {
  const element = listRef.value;
  if (!isDragging.value || !element) {
    return;
  }

  const deltaY = clientY - dragStartY.value;
  if (Math.abs(deltaY) > 4) {
    didDrag.value = true;
  }

  element.scrollTop = dragStartScrollTop.value - deltaY;
  updateFadeEdges();
};

const endDrag = () => {
  isDragging.value = false;
  activeTouchId.value = null;
};

const handlePointerDown = (event: PointerEvent) => {
  if (activeTouchId.value !== null) {
    return;
  }

  beginDrag(event.clientY);
  listRef.value?.setPointerCapture(event.pointerId);
};

const handlePointerMove = (event: PointerEvent) => {
  if (activeTouchId.value !== null) {
    return;
  }

  moveDrag(event.clientY);
};

const handlePointerEnd = (event: PointerEvent) => {
  const element = listRef.value;
  if (element?.hasPointerCapture(event.pointerId)) {
    element.releasePointerCapture(event.pointerId);
  }

  if (activeTouchId.value === null) {
    endDrag();
  }
};

const getActiveTouch = (event: TouchEvent) => {
  const touches = Array.from(event.changedTouches);
  return touches.find((touch) => touch.identifier === activeTouchId.value) ?? null;
};

const handleTouchStart = (event: TouchEvent) => {
  const touch = event.changedTouches[0];
  if (!touch || isDragging.value) {
    return;
  }

  activeTouchId.value = touch.identifier;
  beginDrag(touch.clientY);
};

const handleTouchMove = (event: TouchEvent) => {
  const touch = getActiveTouch(event);
  if (!touch) {
    return;
  }

  event.preventDefault();
  moveDrag(touch.clientY);
};

const handleTouchEnd = (event: TouchEvent) => {
  if (getActiveTouch(event)) {
    endDrag();
  }
};

const handleMessageClick = (messageId: string) => {
  if (didDrag.value) {
    didDrag.value = false;
    return;
  }

  emit("messageClick", messageId);
};

onMounted(() => {
  void scrollToLatest();
});

watch(
  () => props.messages.length,
  () => {
    void scrollToLatest();
  },
);
</script>

<template>
  <div
    class="fade-list-shell"
    :class="{ 'has-top-content': hasTopContent, 'has-bottom-content': hasBottomContent }"
    aria-label="Recent conversation"
  >
    <div class="fade-edge top" aria-hidden="true"></div>
    <TransitionGroup
      ref="listRef"
      name="fade-message"
      tag="div"
      class="fade-list"
      @scroll.passive="updateFadeEdges"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerEnd"
      @pointercancel="handlePointerEnd"
      @lostpointercapture="handlePointerEnd"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchEnd"
    >
      <button
        v-for="message in props.messages"
        :key="message.id"
        class="fade-message"
        :class="{ assistant: message.role === 'assistant', user: message.role === 'user' }"
        type="button"
        @click="handleMessageClick(message.id)"
      >
        <span class="message-mark" aria-hidden="true"></span>
        <span class="message-text">{{ message.content }}</span>
        <span class="message-meta">
          <span>{{ message.role === "assistant" ? "AI" : "YOU" }}</span>
          <time>{{ message.time }}</time>
        </span>
      </button>
    </TransitionGroup>
    <div class="fade-edge bottom" aria-hidden="true"></div>
  </div>
</template>

<style scoped>
.fade-list-shell {
  position: relative;
  height: min(100%, 560px);
  width: 100%;
  overflow: hidden;
}

.fade-list {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  width: 100%;
  display: grid;
  align-content: start;
  gap: clamp(9px, 1.6vh, 14px);
  padding: clamp(30px, 9vh, 70px) 0;
  scrollbar-width: none;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-mask-image: linear-gradient(
    180deg,
    transparent 0%,
    #000 18%,
    #000 82%,
    transparent 100%
  );
  mask-image: linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%);
}

.fade-list::-webkit-scrollbar {
  display: none;
}

.fade-list:active {
  cursor: grabbing;
}

.fade-message {
  width: min(100%, 292px);
  height: 74px;
  justify-self: end;
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 6px 10px;
  padding: 13px 15px 11px;
  border-radius: 17px;
  border: 1px solid rgba(126, 169, 205, 0.34);
  color: rgba(244, 249, 255, 0.94);
  text-align: left;
  cursor: pointer;
  background:
    radial-gradient(150px 82px at 16% 0%, rgba(255, 255, 255, 0.08), transparent 70%),
    linear-gradient(180deg, rgba(10, 18, 30, 0.82), rgba(5, 10, 18, 0.86));
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease;
}

.fade-message:hover {
  transform: translateX(-3px);
  border-color: rgba(106, 225, 241, 0.62);
}

.fade-message.assistant {
  border-color: rgba(77, 205, 255, 0.58);
  background:
    radial-gradient(160px 92px at 14% 0%, rgba(49, 206, 255, 0.28), transparent 72%),
    linear-gradient(180deg, rgba(6, 79, 130, 0.84), rgba(4, 47, 88, 0.86));
}

.message-mark {
  width: 8px;
  height: 8px;
  align-self: start;
  margin-top: 4px;
  border-radius: 999px;
  background: rgba(143, 165, 188, 0.75);
}

.assistant .message-mark {
  background: #33e7ff;
  box-shadow: 0 0 14px rgba(51, 231, 255, 0.72);
}

.message-text {
  min-width: 0;
  font-size: clamp(13px, 1.28vw, 16px);
  line-height: 1.38;
  letter-spacing: 0;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.message-meta {
  grid-column: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(190, 209, 226, 0.8);
  font-size: clamp(10px, 0.9vw, 12px);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.fade-edge {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 2;
  height: 22%;
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms ease;
}

.fade-edge.top {
  top: 0;
  background: linear-gradient(180deg, rgba(5, 11, 20, 0.92), rgba(5, 11, 20, 0));
}

.fade-edge.bottom {
  bottom: 0;
  background: linear-gradient(0deg, rgba(5, 11, 20, 0.92), rgba(5, 11, 20, 0));
}

.has-top-content .fade-edge.top,
.has-bottom-content .fade-edge.bottom {
  opacity: 1;
}

.fade-message-enter-active,
.fade-message-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.fade-message-enter-from,
.fade-message-leave-to {
  opacity: 0;
  transform: translate3d(16px, 12px, 0) scale(0.97);
}

@media (max-width: 860px), (max-height: 520px) {
  .fade-message {
    width: min(100%, 236px);
    height: 58px;
    gap: 4px 8px;
    padding: 10px 11px 8px;
    border-radius: 14px;
  }

  .message-text {
    display: -webkit-box;
    overflow: hidden;
    font-size: 12px;
    line-height: 1.28;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .message-meta {
    font-size: 9px;
  }
}
</style>
