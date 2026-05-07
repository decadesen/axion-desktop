<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import AxionChatWindow from "./AxionChatWindow.vue";

type MessageItem = {
  id: string;
  role: "assistant" | "user";
  name?: string;
  time?: string;
  text?: string;
  status?: "streaming" | "done";
  code?: {
    language: string;
    content: string;
  };
};

const initialMessages: MessageItem[] = [
  {
    id: "m4",
    role: "user",
    name: "你",
    time: "22:45",
    text: "帮我写一个快速排序的 Python 实现",
  },
  {
    id: "m5",
    role: "assistant",
    name: "Axion",
    time: "22:45",
    text: "当然可以，下面是一个简洁的 Python 快速排序实现：",
    status: "done",
    code: {
      language: "python",
      content:
        "def quicksort(arr):\n" +
        "    if len(arr) <= 1:\n" +
        "        return arr\n" +
        "    pivot = arr[len(arr) // 2]\n" +
        "    left = [x for x in arr if x < pivot]\n" +
        "    middle = [x for x in arr if x == pivot]\n" +
        "    right = [x for x in arr if x > pivot]\n" +
        "    return quicksort(left) + middle + quicksort(right)",
    },
  },
  {
    id: "m6",
    role: "user",
    name: "你",
    time: "22:46",
    text: "能解释一下时间复杂度吗？",
  },
  {
    id: "m7",
    role: "assistant",
    name: "Axion",
    time: "22:46",
    text:
      "平均情况下，快速排序的时间复杂度是 O(n log n)。如果每次基准都分得很不均匀，最坏情况会退化到 O(n²)。",
    status: "done",
  },
  {
    id: "m8",
    role: "user",
    name: "你",
    time: "22:47",
    text: "明白了，谢谢。顺便告诉我怎么避免最坏情况。",
  },
];

const historyPages: MessageItem[][] = [
  [
    {
      id: "m1",
      role: "user",
      name: "你",
      time: "22:41",
      text: "今天系统状态怎么样？",
    },
    {
      id: "m2",
      role: "assistant",
      name: "Axion",
      time: "22:41",
      text: "系统运行稳定，CPU 和 GPU 占用都处于较低区间。",
      status: "done",
    },
    {
      id: "m3",
      role: "user",
      name: "你",
      time: "22:42",
      text: "那就好。",
    },
    {
      id: "m3-1",
      role: "assistant",
      name: "Axion",
      time: "22:42",
      text: "如果需要，我也可以继续监控资源波动并在异常时提醒你。",
      status: "done",
    },
  ],
  [
    {
      id: "m-4",
      role: "user",
      name: "你",
      time: "22:37",
      text: "网络现在稳定吗？",
    },
    {
      id: "m-3",
      role: "assistant",
      name: "Axion",
      time: "22:37",
      text: "当前网络延迟正常，上传和下载都比较平稳。",
      status: "done",
    },
    {
      id: "m-2",
      role: "user",
      name: "你",
      time: "22:38",
      text: "帮我记一下今晚还要检查一次服务日志。",
    },
    {
      id: "m-1",
      role: "assistant",
      name: "Axion",
      time: "22:38",
      text: "已经记住了，稍后如果你再次打开工具页，我会提醒你查看日志。",
      status: "done",
    },
  ],
  [
    {
      id: "m-8",
      role: "user",
      name: "你",
      time: "22:31",
      text: "今天启动 Ubuntu 侧应用的时候有异常吗？",
    },
    {
      id: "m-7",
      role: "assistant",
      name: "Axion",
      time: "22:31",
      text: "有一次启动稍慢，但最后成功完成，没有留下新的错误记录。",
      status: "done",
    },
    {
      id: "m-6",
      role: "user",
      name: "你",
      time: "22:32",
      text: "好的，继续保持监控。",
    },
    {
      id: "m-5",
      role: "assistant",
      name: "Axion",
      time: "22:32",
      text: "收到，我会继续观察状态变化。",
      status: "done",
    },
  ],
];

const messages = ref<MessageItem[]>([...initialMessages]);
const historyCursor = ref(0);
const hasMoreHistory = ref(true);
const isLoadingHistory = ref(false);
const isSpeaking = ref(false);
const isListening = ref(false);
const voiceLevels = ref([0.32, 0.48, 0.72, 0.56, 0.84, 0.62, 0.38, 0.52, 0.44, 0.28]);
const panelTitle = ref("聊天");
const panelWidth = ref(704);
const panelHeight = ref(846);
const inputPlaceholder = ref("呼唤“小兰小兰”开始对话");

const streamChunks = [
  "可以从两个方向来降低最坏情况出现的概率。",
  " 第一，尽量不要固定选择第一个或最后一个元素作为 pivot。",
  " 第二，可以使用随机 pivot，或者三数取中。",
  " 这样通常能让划分更均衡，平均性能更稳定。",
];

let streamTimer: number | null = null;
let historyTimer: number | null = null;
let listeningLevelTimer: number | null = null;

const clearTimers = () => {
  if (streamTimer !== null) window.clearInterval(streamTimer);
  if (historyTimer !== null) window.clearTimeout(historyTimer);
  if (listeningLevelTimer !== null) window.clearInterval(listeningLevelTimer);
  streamTimer = null;
  historyTimer = null;
  listeningLevelTimer = null;
};

const randomizeVoiceLevels = () => {
  voiceLevels.value = voiceLevels.value.map(() => 0.22 + Math.random() * 0.78);
};

const startMockStreaming = () => {
  const streamingMessage: MessageItem = {
    id: "m9",
    role: "assistant",
    name: "Axion",
    time: "22:47",
    text: "",
    status: "streaming",
  };

  messages.value = [...messages.value, streamingMessage];
  isSpeaking.value = true;

  let chunkIndex = 0;
  streamTimer = window.setInterval(() => {
    messages.value = messages.value.map((message) => {
      if (message.id !== "m9") return message;
      return {
        ...message,
        text: `${message.text ?? ""}${streamChunks[chunkIndex] ?? ""}`,
      };
    });

    chunkIndex += 1;

    if (chunkIndex >= streamChunks.length) {
      if (streamTimer !== null) window.clearInterval(streamTimer);
      streamTimer = null;
      messages.value = messages.value.map((message) =>
        message.id === "m9" ? { ...message, status: "done" } : message,
      );
      isSpeaking.value = false;
    }
  }, 850);
};

const handleRequestHistory = () => {
  if (isLoadingHistory.value || !hasMoreHistory.value) return;

  isLoadingHistory.value = true;
  historyTimer = window.setTimeout(() => {
    const nextPage = historyPages[historyCursor.value];
    if (!nextPage) {
      hasMoreHistory.value = false;
      isLoadingHistory.value = false;
      historyTimer = null;
      return;
    }

    messages.value = [...nextPage, ...messages.value];
    historyCursor.value += 1;
    hasMoreHistory.value = historyCursor.value < historyPages.length;
    isLoadingHistory.value = false;
    historyTimer = null;
  }, 900);
};

const resetDebugState = () => {
  messages.value = [...initialMessages];
  historyCursor.value = 0;
  hasMoreHistory.value = true;
  isLoadingHistory.value = false;
  isSpeaking.value = false;
  isListening.value = false;
  voiceLevels.value = [0.32, 0.48, 0.72, 0.56, 0.84, 0.62, 0.38, 0.52, 0.44, 0.28];
  panelTitle.value = "聊天";
  panelWidth.value = 758;
  panelHeight.value = 654;
  inputPlaceholder.value = "呼唤“小兰小兰”开始对话";
};

onMounted(() => {
  listeningLevelTimer = window.setInterval(() => {
    if (!isListening.value) return;
    randomizeVoiceLevels();
  }, 180);

  window.setTimeout(() => {
    startMockStreaming();
  }, 600);
});

onBeforeUnmount(() => {
  clearTimers();
});
</script>

<template>
  <main class="chat-debug-page">
    <div class="debug-backdrop"></div>
    <aside class="debug-controls">
      <div class="debug-controls__head">
        <div>
          <p class="debug-eyebrow">调试参数</p>
          <h2>Axion 聊天窗口</h2>
        </div>
        <button type="button" class="debug-reset" @click="resetDebugState">重置</button>
      </div>

      <label class="debug-field">
        <span>标题</span>
        <input v-model="panelTitle" type="text" />
      </label>

      <div class="debug-grid">
        <label class="debug-field">
          <span>宽度</span>
          <input v-model.number="panelWidth" type="number" min="420" max="960" step="1" />
        </label>

        <label class="debug-field">
          <span>高度</span>
          <input v-model.number="panelHeight" type="number" min="420" max="900" step="1" />
        </label>
      </div>

      <label class="debug-field">
        <span>待机文案</span>
        <input v-model="inputPlaceholder" type="text" />
      </label>

      <div class="debug-grid debug-grid--toggles">
        <label class="debug-toggle">
          <input v-model="isListening" type="checkbox" />
          <span>正在聆听</span>
        </label>

        <label class="debug-toggle">
          <input v-model="isSpeaking" type="checkbox" />
          <span>正在回复</span>
        </label>

        <label class="debug-toggle">
          <input v-model="hasMoreHistory" type="checkbox" />
          <span>还有历史记录</span>
        </label>

        <label class="debug-toggle">
          <input v-model="isLoadingHistory" type="checkbox" />
          <span>正在加载历史</span>
        </label>
      </div>

      <div class="debug-actions">
        <button type="button" class="debug-action" @click="randomizeVoiceLevels">
          随机波形
        </button>
        <button type="button" class="debug-action" @click="handleRequestHistory">
          模拟历史加载
        </button>
      </div>
    </aside>

    <div class="debug-stage">
      <AxionChatWindow
        :title="panelTitle"
        :width="panelWidth"
        :height="panelHeight"
        :messages="messages"
        :is-speaking="isSpeaking"
        :is-listening="isListening"
        :voice-levels="voiceLevels"
        :has-more-history="hasMoreHistory"
        :is-loading-history="isLoadingHistory"
        :placeholder="inputPlaceholder"
        @request-history="handleRequestHistory"
      />
    </div>
  </main>
</template>

<style scoped>
.chat-debug-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 48% 66%, rgba(0, 216, 230, 0.2), transparent 18%),
    radial-gradient(circle at 68% 24%, rgba(92, 158, 190, 0.18), transparent 24%),
    radial-gradient(circle at 24% 72%, rgba(0, 216, 230, 0.08), transparent 28%),
    linear-gradient(180deg, #050b12 0%, #03080f 48%, #01050a 100%);
}

.debug-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(760px 340px at 44% 74%, rgba(0, 216, 230, 0.12), transparent 62%),
    radial-gradient(540px 240px at 47% 34%, rgba(72, 132, 168, 0.2), transparent 68%);
  filter: blur(8px);
}

.debug-stage {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 40px 40px 32px 360px;
}

.debug-controls {
  position: absolute;
  top: 28px;
  left: 28px;
  z-index: 2;
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(15, 28, 41, 0.94), rgba(7, 15, 23, 0.94));
  border: 1px solid rgba(101, 175, 194, 0.22);
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(220, 245, 255, 0.05);
  backdrop-filter: blur(18px);
}

.debug-controls__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.debug-eyebrow {
  margin: 0 0 4px;
  color: rgba(120, 219, 232, 0.88);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.debug-controls h2 {
  margin: 0;
  color: #e4f8ff;
  font-size: 18px;
}

.debug-reset,
.debug-action {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(101, 175, 194, 0.24);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: #d3edf4;
  cursor: pointer;
}

.debug-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.debug-field span {
  color: rgba(174, 201, 211, 0.86);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.debug-field input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(101, 175, 194, 0.22);
  border-radius: 12px;
  background: rgba(6, 18, 28, 0.82);
  color: #effbff;
}

.debug-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.debug-grid--toggles {
  grid-template-columns: 1fr 1fr;
}

.debug-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid rgba(101, 175, 194, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  color: #d3edf4;
  font-size: 13px;
}

.debug-toggle input {
  margin: 0;
}

.debug-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
</style>
