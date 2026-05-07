<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import heroAvatar from "../assets/hero.png";

type MessageCode = {
  language: string;
  content: string;
};

type MessageItem = {
  id: string;
  role: "assistant" | "user";
  name?: string;
  time?: string;
  text?: string;
  status?: "streaming" | "done";
  code?: MessageCode;
};

const props = withDefaults(
  defineProps<{
    width?: number | string;
    height?: number | string;
    title?: string;
    isSpeaking?: boolean;
    isListening?: boolean;
    voiceLevels?: number[];
    messages: MessageItem[];
    hasMoreHistory?: boolean;
    isLoadingHistory?: boolean;
    placeholder?: string;
  }>(),
  {
    width: 758,
    height: "100%",
    title: "聊天",
    isSpeaking: false,
    isListening: false,
    voiceLevels: () => [0.32, 0.48, 0.72, 0.56, 0.84, 0.62, 0.38, 0.52, 0.44, 0.28],
    hasMoreHistory: false,
    isLoadingHistory: false,
    placeholder: "呼唤“小兰小兰”开始对话",
  },
);

const emit = defineEmits<{
  close: [];
  requestHistory: [];
  voiceInputTap: [];
}>();

const messageAreaRef = ref<HTMLElement | null>(null);
const shouldStickToBottom = ref(true);
const previousFirstId = ref<string | undefined>(props.messages[0]?.id);
const previousLastId = ref<string | undefined>(props.messages.at(-1)?.id);
const previousLength = ref(props.messages.length);

const normalizedWidth = computed(() =>
  typeof props.width === "number" ? `${props.width}px` : props.width,
);

const normalizedHeight = computed(() =>
  typeof props.height === "number" ? `${props.height}px` : props.height,
);

const containerStyle = computed(() => ({
  width: normalizedWidth.value,
  height: normalizedHeight.value,
}));

const normalizedVoiceLevels = computed(() =>
  props.voiceLevels.map((level) => Math.max(0.14, Math.min(1, level))),
);

const isNearBottom = () => {
  const element = messageAreaRef.value;
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < 60;
};

const scrollToBottom = () => {
  const element = messageAreaRef.value;
  if (!element) return;
  element.scrollTop = element.scrollHeight;
};

const maybeRequestHistory = () => {
  const element = messageAreaRef.value;
  if (!element) return;
  if (element.scrollTop > 40) return;
  if (!props.hasMoreHistory || props.isLoadingHistory) return;
  emit("requestHistory");
};

const handleScroll = () => {
  shouldStickToBottom.value = isNearBottom();
  maybeRequestHistory();
};

watch(
  () =>
    props.messages.map((message) => `${message.id}:${message.status ?? "done"}:${message.text ?? ""}`).join("|"),
  async () => {
    const element = messageAreaRef.value;
    if (!element) return;

    const nextFirstId = props.messages[0]?.id;
    const nextLastId = props.messages.at(-1)?.id;
    const nextLength = props.messages.length;
    const wasPrepended =
      previousLength.value < nextLength &&
      previousFirstId.value !== undefined &&
      nextFirstId !== previousFirstId.value;

    const shouldAutoScroll =
      shouldStickToBottom.value ||
      previousLastId.value !== nextLastId ||
      props.messages.at(-1)?.status === "streaming";

    const previousScrollHeight = element.scrollHeight;

    await nextTick();

    if (wasPrepended) {
      const nextScrollHeight = element.scrollHeight;
      element.scrollTop += nextScrollHeight - previousScrollHeight;
    } else if (shouldAutoScroll) {
      scrollToBottom();
    }

    previousFirstId.value = nextFirstId;
    previousLastId.value = nextLastId;
    previousLength.value = nextLength;
  },
);

onMounted(() => {
  scrollToBottom();
});
</script>

<template>
  <section class="axion-chat-window" :style="containerStyle">
    <header class="chat-titlebar">
      <h2 class="chat-title">{{ title }}</h2>
      <div class="window-controls">
        <button class="window-control close" type="button" @click="emit('close')">
          <svg
            class="window-close-icon"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
          </svg>
        </button>
      </div>
    </header>

    <div ref="messageAreaRef" class="message-area" @scroll="handleScroll">
      <div v-if="isLoadingHistory" class="history-state">加载更早对话中…</div>
      <div v-else-if="hasMoreHistory" class="history-state subtle">上滑加载更早记录</div>

      <article
        v-for="message in messages"
        :key="message.id"
        class="message"
        :class="message.role"
      >
        <div v-if="message.role === 'assistant'" class="avatar assistant" aria-hidden="true">
          <img class="avatar-image" :src="heroAvatar" alt="" />
        </div>

        <div
          class="message-content"
          :class="message.role === 'user' ? 'user-content' : 'assistant-content'"
        >
          <div class="meta" :class="{ user: message.role === 'user' }">
            <span class="name">{{ message.name || (message.role === "assistant" ? "Axion" : "你") }}</span>
            <span v-if="message.time" class="time">{{ message.time }}</span>
          </div>

          <div v-if="message.role === 'user'" class="user-bubble">
            {{ message.text }}
          </div>

          <template v-else>
            <p v-if="message.text" class="assistant-text">
              {{ message.text }}
              <span v-if="message.status === 'streaming'" class="stream-cursor"></span>
            </p>

            <section v-if="message.code" class="code-card">
              <header class="code-header">
                <span>{{ message.code.language }}</span>
                <button class="copy-btn" type="button">
                  <span>复制</span>
                </button>
              </header>
              <pre class="code-body"><code>{{ message.code.content }}</code></pre>
            </section>
          </template>
        </div>

        <div v-if="message.role === 'user'" class="avatar user" aria-hidden="true">
          <span class="user-avatar-glyph">你</span>
        </div>
      </article>

    </div>

    <footer class="chat-composer">
      <div class="chat-input-shell" :class="{ listening: isListening }" @click="emit('voiceInputTap')">
        <div v-if="!isListening" class="chat-idle-copy">
          {{ placeholder }}
        </div>

        <div v-else class="voice-waveform" aria-label="语音输入中">
          <span
            v-for="(level, index) in normalizedVoiceLevels"
            :key="index"
            class="voice-bar"
            :style="{
              '--bar-scale': level,
              '--bar-delay': `${index * 80}ms`,
            }"
          ></span>
        </div>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.axion-chat-window {
  --cyan: #00d8e6;
  --cyan-soft: #5db9ca;
  --edge-bright: rgba(112, 188, 205, 0.64);
  --edge-soft: rgba(94, 154, 172, 0.38);
  --edge-haze: rgba(44, 74, 92, 0.22);
  --panel-dark: #020d14;
  --panel-blue: #18384b;
  --text-main: #dcebf0;
  --text-muted: #7f96a3;
  --code-bg: #09151c;

  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 0;
  max-height: 100%;
  border-radius: 24px;
  border: 3px solid transparent;
  font-family:
    "Noto Sans CJK SC",
    "Noto Sans SC",
    "Microsoft YaHei",
    "PingFang SC",
    "Source Han Sans SC",
    "WenQuanYi Micro Hei",
    "Segoe UI",
    sans-serif;
  background:
    radial-gradient(200px 16px at 35% 0%, var(--edge-bright) 0%, rgba(96, 154, 172, 0.24) 52%, transparent 100%) border-box,
    radial-gradient(8px 160px at 0% 75%, rgba(88, 146, 164, 0.52) 0%, rgba(126, 221, 255, 0.14) 40%, transparent 100%) border-box,
    radial-gradient(3px 380px at 100% 45%, rgba(99, 185, 209, 0.733) 0%, rgba(98, 164, 190, 0.747) 80%, transparent 100%) border-box,
    radial-gradient(800px 24px at 50% 100%, rgba(98, 152, 170, 0.2) 0%, transparent 100%) border-box,
    linear-gradient(rgba(7, 24, 33, 0.84), rgba(3, 15, 22, 0.84)) padding-box,
    linear-gradient(rgba(128, 198, 241, 0.24), rgba(125, 182, 218, 0.44)) border-box;
  overflow: hidden;
  backdrop-filter: blur(18px) saturate(125%);
  -webkit-backdrop-filter: blur(18px) saturate(125%);
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.45),
    0 0 18px rgba(96, 154, 172, 0.1),
    0 0 30px rgba(96, 154, 172, 0.05),
    inset 0 1px 0 rgba(156, 196, 210, 0.1),
    inset 0 0 24px rgba(96, 154, 172, 0.032),
    inset 6px 0 12px rgba(96, 154, 172, 0.02),
    inset -10px 0 14px rgba(96, 154, 172, 0.045);
}

.axion-chat-window::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(210px 54px at 35% 0%, rgba(96, 170, 188, 0.17), transparent 68%),
    radial-gradient(260px 72px at 50% -5%, rgba(66, 144, 164, 0.1), transparent 72%),
    radial-gradient(90px 260px at 0% 75%, rgba(74, 126, 143, 0.12), transparent 70%),
    radial-gradient(90px 260px at 100% 25%, rgba(82, 138, 154, 0.14), transparent 70%),
    radial-gradient(600px 90px at 50% 100%, rgba(82, 130, 147, 0.09), transparent 70%),
    radial-gradient(620px 420px at 42% -8%, rgba(60, 97, 116, 0.12) 0%, rgba(34, 66, 82, 0.08) 38%, rgba(3, 15, 22, 0) 72%),
    radial-gradient(44px 520px at 0% 44%, rgba(64, 109, 125, 0.04) 0%, rgba(35, 69, 84, 0.022) 26%, rgba(9, 22, 31, 0.01) 44%, rgba(0, 0, 0, 0) 62%),
    radial-gradient(58px 620px at 100% 42%, rgba(73, 126, 142, 0.075) 0%, rgba(45, 87, 106, 0.04) 28%, rgba(9, 22, 31, 0.022) 46%, rgba(0, 0, 0, 0) 66%),
    radial-gradient(420px 700px at 100% 55%, rgba(56, 94, 110, 0.06) 0%, rgba(0, 220, 230, 0) 65%),
    linear-gradient(180deg, rgba(22, 56, 68, 0.24) 0%, rgba(10, 27, 35, 0.11) 24%, rgba(2, 12, 18, 0.06) 48%, rgba(2, 12, 18, 0.02) 100%);
}

.axion-chat-window::after {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: 28px;
  pointer-events: none;
  background:
    linear-gradient(
      148deg,
      rgba(96, 168, 186, 0.507) 0% 8%,
      rgba(76, 137, 156, 0.315) 10%,
      rgba(54, 96, 111, 0.03) 15%,
      transparent 12.6% 78.4%,
      rgba(54, 96, 111, 0.03) 75%,
      rgba(76, 137, 156, 0.315) 92%,
      rgba(96, 168, 186, 0.507)  96% 100%
    ),
    radial-gradient(160px 12px at 35% 0%, rgba(94, 166, 184, 0.527) 0%, rgba(72, 126, 144, 0.06) 50%, transparent 100%),
    radial-gradient(16px 160px at 0% 75%, rgba(74, 127, 144, 0.14) 0%, rgba(52, 92, 108, 0.045) 50%, transparent 100%),
    radial-gradient(16px 160px at 100% 25%, rgba(82, 138, 155, 0.18) 0%, rgba(58, 102, 118, 0.06) 50%, transparent 100%),
    radial-gradient(600px 16px at 50% 100%, rgba(70, 116, 132, 0.06) 0%, transparent 100%);
  filter: blur(4px);
  opacity: 0.82;
}

.axion-chat-window > * {
  position: relative;
  z-index: 1;
}

.chat-titlebar {
  position: relative;
  flex: 0 0 60px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-titlebar::after {
  content: "";
  position: absolute;
  left: 2px;
  right: 2px;
  bottom: 0;
  height: 1px;
  background:
    linear-gradient(
      90deg,
      rgba(132, 208, 224, 0) 0%,
      rgba(80, 132, 151, 0.08) 12%,
      rgba(92, 153, 171, 0.16) 28%,
      rgba(128, 206, 222, 0.34) 50%,
      rgba(92, 153, 171, 0.16) 72%,
      rgba(80, 132, 151, 0.08) 88%,
      rgba(132, 208, 224, 0) 100%
    );
  box-shadow:
    0 0 8px rgba(108, 184, 201, 0.06),
    0 0 16px rgba(108, 184, 201, 0.028);
}

.chat-title {
  margin: 0;
  color: var(--text-main);
  font-size: 24px;
  line-height: 1;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.window-controls {
  display: flex;
  align-items: center;
}

.window-control {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  padding: 0;
  color: rgba(220, 236, 242, 0.82);
  background: transparent;
  cursor: pointer;
}

.window-close-icon {
  width: 18px;
  height: 18px;
  display: block;
}

.window-control.close:hover {
  color: rgba(236, 246, 250, 0.96);
}

.message-area {
  flex: 1 1 auto;
  min-height: 0;
  padding: 18px 34px 12px;
  box-sizing: border-box;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(93, 185, 202, 0.28) transparent;
}

.message-area::-webkit-scrollbar {
  width: 10px;
}

.message-area::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(93, 185, 202, 0.22);
}

.history-state {
  margin-bottom: 20px;
  color: rgba(184, 203, 211, 0.88);
  font-size: 12px;
  text-align: center;
}

.history-state.subtle {
  color: rgba(127, 150, 163, 0.92);
}

.message {
  margin-bottom: 28px;
}

.message.assistant {
  display: grid;
  grid-template-columns: 42px 1fr;
  column-gap: 14px;
  align-items: flex-start;
}

.message.user {
  display: grid;
  grid-template-columns: 1fr 40px;
  column-gap: 14px;
  align-items: flex-start;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}

.user-avatar-glyph {
  color: rgba(132, 220, 236, 0.96);
  font-size: 14px;
  line-height: 1;
}

.message-content {
  min-width: 0;
}

.meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1;
  color: var(--text-muted);
}

.meta.user {
  justify-content: flex-end;
}

.name {
  color: var(--text-main);
  font-size: 14px;
  font-weight: 600;
}

.time {
  font-size: 12px;
  color: rgba(160, 180, 190, 0.65);
}

.user-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.user-bubble {
  display: inline-block;
  max-width: 310px;
  padding: 14px 18px;
  background: linear-gradient(
    180deg,
    rgba(26, 63, 80, 0.88) 0%,
    rgba(15, 42, 55, 0.88) 100%
  );
  border: 1px solid rgba(80, 145, 165, 0.14);
  border-radius: 9px;
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.55;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.035),
    0 8px 24px rgba(0, 0, 0, 0.16);
}

.assistant-content {
  max-width: 590px;
}

.assistant-text {
  margin: 0;
  color: var(--text-main);
  font-size: 16px;
  line-height: 1.75;
  letter-spacing: 0.1px;
}

.stream-cursor {
  display: inline-block;
  width: 8px;
  height: 1.05em;
  margin-left: 6px;
  vertical-align: middle;
  border-radius: 999px;
  background: linear-gradient(180deg, #93f6ff 0%, #42dff0 100%);
  box-shadow: 0 0 10px rgba(0, 216, 230, 0.28);
  animation: pulse-cursor 1s ease-in-out infinite;
}

.code-card {
  width: 564px;
  margin-top: 14px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--code-bg);
  border: 1px solid rgba(70, 105, 120, 0.34);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.025),
    0 12px 30px rgba(0, 0, 0, 0.22);
}

.code-header {
  height: 42px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(18, 31, 38, 0.94);
  border-bottom: 1px solid rgba(70, 105, 120, 0.22);
  color: rgba(180, 198, 205, 0.76);
  font-size: 13px;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 0;
  padding: 0;
  color: rgba(220, 235, 240, 0.82);
  font-size: 13px;
  background: transparent;
}

.code-body {
  margin: 0;
  padding: 16px 20px 20px;
  background: #09151c;
  color: #c8d4da;
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
  font-size: 15px;
  line-height: 1.55;
  white-space: pre-wrap;
}

.chat-composer {
  flex: 0 0 64px;
  min-height: 64px;
  padding: 0 32px 16px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-input-shell {
  width: min(100%, 352px);
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  border-radius: 12px;
  border: 1px solid rgba(86, 150, 165, 0.38);
  background: rgba(6, 25, 35, 0.72);
  color: var(--text-main);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.035),
    0 0 18px rgba(0, 216, 230, 0.035);
}

.chat-input-shell.listening {
  border-color: rgba(110, 202, 219, 0.44);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.045),
    0 0 22px rgba(0, 216, 230, 0.07);
}

.chat-idle-copy {
  color: rgba(190, 212, 220, 0.76);
  font-size: 14px;
  line-height: 1;
  letter-spacing: 0.02em;
  text-align: center;
}

.voice-waveform {
  width: 100%;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.voice-bar {
  width: 4px;
  height: calc(22px * var(--bar-scale));
  min-height: 8px;
  border-radius: 999px;
  background: linear-gradient(180deg, #baf8ff 0%, #53e7ff 46%, #169bb5 100%);
  box-shadow:
    0 0 10px rgba(83, 231, 255, 0.18),
    0 0 18px rgba(22, 155, 181, 0.08);
  transform-origin: center;
  animation: voice-wave 1.2s ease-in-out infinite;
  animation-delay: var(--bar-delay);
}

@keyframes pulse-cursor {
  0%,
  100% {
    opacity: 0.35;
  }

  50% {
    opacity: 1;
  }
}

@keyframes voice-wave {
  0%,
  100% {
    transform: scaleY(0.72);
    opacity: 0.58;
  }

  50% {
    transform: scaleY(1.18);
    opacity: 1;
  }
}
</style>
