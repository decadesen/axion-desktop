<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ConversationMessage } from "../types";

const props = defineProps<{
  messages: ConversationMessage[];
}>();

const emit = defineEmits<{
  messageClick: [id: string];
}>();

const getInitialSelectedIndex = (length: number) => Math.max(0, length - 3);

const selectedIndex = ref(getInitialSelectedIndex(props.messages.length));
const dragStartY = ref(0);
const dragRemainder = ref(0);
const isDragging = ref(false);
const didDrag = ref(false);
const activeTouchId = ref<number | null>(null);

watch(
  () => props.messages.length,
  (length) => {
    selectedIndex.value = Math.min(getInitialSelectedIndex(length), Math.max(0, length - 1));
  },
);

const wheelMessages = computed(() =>
  props.messages
    .map((message, index) => {
      const offset = index - selectedIndex.value;
      const abs = Math.abs(offset);
      const clamped = Math.min(abs, 2);
      const angle = offset * 0.34;
      const radius = 340;
      const baseX = (1 - Math.cos(angle)) * radius;
      const x = baseX + (abs === 2 ? 58 : 0);
      const y = Math.sin(angle) * radius;
      const rotation = Math.max(-20, Math.min(20, -offset * 7));
      const scaleMap = [1, 0.9, 0.56];
      const opacityMap = [1, 0.9, 0.28];
      const scale = scaleMap[clamped];
      const opacity = opacityMap[clamped];

      return {
        message,
        offset,
        active: offset === 0,
        near: abs === 1,
        edge: abs === 2,
        isVisible: abs <= 2,
        style: {
          transform: `translate3d(${-x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`,
          opacity,
          zIndex: 40 - abs,
        },
      };
    })
    .filter((item) => item.isVisible),
);

const moveSelection = (direction: number) => {
  selectedIndex.value = Math.min(
    props.messages.length - 1,
    Math.max(0, selectedIndex.value + direction),
  );
};

const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  moveSelection(event.deltaY > 0 ? 1 : -1);
};

const beginDrag = (clientY: number) => {
  isDragging.value = true;
  didDrag.value = false;
  dragStartY.value = clientY;
  dragRemainder.value = 0;
};

const moveDrag = (clientY: number) => {
  if (!isDragging.value) {
    return;
  }

  const delta = clientY - dragStartY.value;
  const nextRemainder = dragRemainder.value + delta;
  dragStartY.value = clientY;

  if (Math.abs(nextRemainder) < 44) {
    dragRemainder.value = nextRemainder;
    return;
  }

  didDrag.value = true;
  moveSelection(nextRemainder > 0 ? -1 : 1);
  dragRemainder.value = 0;
};

const endDrag = () => {
  isDragging.value = false;
  dragRemainder.value = 0;
  activeTouchId.value = null;
};

const handlePointerDown = (event: PointerEvent) => {
  if (activeTouchId.value !== null) {
    return;
  }

  beginDrag(event.clientY);
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
};

const handlePointerMove = (event: PointerEvent) => {
  if (activeTouchId.value !== null) {
    return;
  }

  moveDrag(event.clientY);
};

const handlePointerEnd = (event: PointerEvent) => {
  const element = event.currentTarget as HTMLElement;
  if (element.hasPointerCapture(event.pointerId)) {
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

const handleMessageClick = (message: ConversationMessage) => {
  if (didDrag.value) {
    didDrag.value = false;
    return;
  }

  selectedIndex.value = props.messages.findIndex((item) => item.id === message.id);
  emit("messageClick", message.id);
};
</script>

<template>
  <div
    class="wheel-shell"
    :class="{ dragging: isDragging }"
    aria-label="Conversation wheel"
    @wheel="handleWheel"
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
    <div class="wheel-ring" aria-hidden="true">
      <span v-for="index in 17" :key="index" :style="{ transform: `rotate(${index * 7 - 62}deg)` }"></span>
    </div>
    <div class="wheel-focus" aria-hidden="true"></div>

    <button
      v-for="item in wheelMessages"
      :key="item.message.id"
      class="wheel-message"
      :class="{
        assistant: item.message.role === 'assistant',
        user: item.message.role === 'user',
        active: item.active,
        near: item.near,
        edge: item.edge,
      }"
      type="button"
      :style="item.style"
      @click="handleMessageClick(item.message)"
    >
      <span class="message-role">{{ item.message.role === "assistant" ? "AI" : "YOU" }}</span>
      <span class="message-text">{{ item.message.content }}</span>
      <time>{{ item.message.time }}</time>
    </button>
  </div>
</template>

<style scoped>
.wheel-shell {
  position: relative;
  height: min(100%, 560px);
  width: 100%;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  user-select: none;
}

.wheel-shell.dragging {
  cursor: grabbing;
}

.wheel-ring {
  position: absolute;
  top: 50%;
  right: -282px;
  width: 560px;
  height: 560px;
  border-radius: 50%;
  border: 1px solid rgba(66, 216, 255, 0.2);
  transform: translateY(-50%);
  box-shadow:
    0 0 54px rgba(24, 231, 255, 0.1),
    inset 0 0 58px rgba(24, 231, 255, 0.06);
}

.wheel-ring::after {
  content: "";
  position: absolute;
  inset: 58px;
  border-radius: inherit;
  border: 1px solid rgba(66, 216, 255, 0.1);
}

.wheel-ring span {
  position: absolute;
  top: 50%;
  left: 10px;
  width: 20px;
  height: 1px;
  transform-origin: 270px 0;
  background: rgba(88, 221, 255, 0.28);
}

.wheel-focus {
  position: absolute;
  top: 50%;
  right: 0;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(88, 235, 255, 0.84);
  border-left: 0;
  border-bottom: 0;
  transform: translateY(-50%) rotate(45deg);
  filter: drop-shadow(0 0 14px rgba(88, 235, 255, 0.5));
}

.wheel-message {
  position: absolute;
  top: calc(50% - 40px);
  right: 34px;
  width: min(100% - 52px, 286px);
  height: 70px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-rows: auto 1fr;
  gap: 5px 10px;
  padding: 11px 13px 10px;
  border-radius: 16px;
  border: 1px solid rgba(119, 159, 196, 0.34);
  color: rgba(243, 249, 255, 0.94);
  text-align: left;
  cursor: pointer;
  transform-origin: calc(100% + 34px) 50%;
  background:
    radial-gradient(145px 80px at 15% 0%, rgba(255, 255, 255, 0.08), transparent 72%),
    linear-gradient(180deg, rgba(9, 17, 29, 0.84), rgba(4, 9, 17, 0.88));
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition:
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 220ms ease,
    border-color 180ms ease,
    background 180ms ease;
}

.wheel-message.assistant {
  border-color: rgba(75, 208, 255, 0.46);
  background:
    radial-gradient(155px 88px at 16% 0%, rgba(46, 203, 255, 0.22), transparent 72%),
    linear-gradient(180deg, rgba(7, 61, 105, 0.82), rgba(4, 32, 65, 0.88));
}

.wheel-message.active {
  top: calc(50% - 58px);
  right: 30px;
  width: min(100% - 44px, 326px);
  height: 116px;
  border-color: rgba(93, 231, 255, 0.88);
  box-shadow:
    0 0 26px rgba(24, 231, 255, 0.28),
    0 18px 42px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.wheel-message.near {
  width: min(100% - 48px, 302px);
  height: 82px;
}

.wheel-message.edge {
  width: min(100% - 58px, 270px);
}

.message-role {
  color: rgba(111, 232, 249, 0.92);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.message-text {
  grid-column: 1 / 4;
  min-width: 0;
  color: rgba(247, 251, 255, 0.95);
  font-size: clamp(11px, 1vw, 13px);
  line-height: 1.32;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.active .message-text {
  font-size: clamp(13px, 1.18vw, 15px);
  line-height: 1.34;
  -webkit-line-clamp: 4;
}

.near .message-text {
  font-size: clamp(12px, 1.08vw, 14px);
  line-height: 1.32;
  -webkit-line-clamp: 3;
}

.edge .message-text {
  font-size: clamp(10px, 0.92vw, 12px);
  -webkit-line-clamp: 1;
}

time {
  justify-self: end;
  color: rgba(198, 215, 232, 0.82);
  font-size: 11px;
  font-weight: 700;
}

@media (max-width: 860px), (max-height: 520px) {
  .wheel-ring {
    right: -226px;
    width: 448px;
    height: 448px;
  }

  .wheel-ring span {
    transform-origin: 216px 0;
  }

  .wheel-message {
    right: 26px;
    width: min(100% - 32px, 230px);
    height: 54px;
    padding: 9px 11px;
    border-radius: 14px;
  }

  .wheel-message.active {
    top: calc(50% - 45px);
    right: 20px;
    width: min(100% - 28px, 254px);
    height: 90px;
  }

  .wheel-message.near {
    width: min(100% - 30px, 240px);
    height: 66px;
  }

  .wheel-message.edge {
    width: min(100% - 42px, 210px);
  }

  .message-text {
    font-size: 10px;
    line-height: 1.28;
    -webkit-line-clamp: 2;
  }

  .active .message-text {
    font-size: 12px;
    line-height: 1.3;
    -webkit-line-clamp: 3;
  }

  .near .message-text {
    font-size: 11px;
    line-height: 1.28;
    -webkit-line-clamp: 3;
  }

  .message-role,
  time {
    font-size: 9px;
  }
}
</style>
