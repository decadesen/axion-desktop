import { ref, watch } from "vue";
import type { ConversationDisplayMode } from "./types";

const storageKey = "axion-desktop.conversationDisplayMode";
const modes: ConversationDisplayMode[] = ["fade", "wheel"];

const readInitialMode = (): ConversationDisplayMode => {
  if (typeof window === "undefined") {
    return "fade";
  }

  const stored = window.localStorage.getItem(storageKey);
  return modes.includes(stored as ConversationDisplayMode)
    ? (stored as ConversationDisplayMode)
    : "fade";
};

export const conversationDisplayMode = ref<ConversationDisplayMode>(readInitialMode());

if (typeof window !== "undefined") {
  watch(conversationDisplayMode, (mode) => {
    window.localStorage.setItem(storageKey, mode);
  });
}

export const conversationDisplayModeOptions: Array<{
  value: ConversationDisplayMode;
  label: string;
  description: string;
}> = [
  {
    value: "fade",
    label: "渐变列表",
    description: "上下边缘透明渐隐，适合快速浏览最近消息。",
  },
  {
    value: "wheel",
    label: "轮盘列表",
    description: "以右侧中点为轴滚动，当前消息保持清晰。",
  },
];
