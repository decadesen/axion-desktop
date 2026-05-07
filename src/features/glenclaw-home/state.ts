import type {
  AssistantState,
  Live2DExpression,
  Live2DMotion,
  NotificationItemData,
  ConversationMessage,
} from "./types";

type CharacterState = {
  expression: Live2DExpression;
  motion: Live2DMotion;
};

export const assistantStateLabels: Record<AssistantState, string> = {
  standby: "Standby",
  listening: "Listening",
  thinking: "Thinking",
  replying: "Replying",
  offline: "Offline",
  error: "Error",
};

export const deriveCharacterState = (state: AssistantState): CharacterState => {
  const map: Record<AssistantState, CharacterState> = {
    standby: { expression: "smile", motion: "idle" },
    listening: { expression: "listening", motion: "listen" },
    thinking: { expression: "thinking", motion: "think" },
    replying: { expression: "speaking", motion: "speak" },
    offline: { expression: "neutral", motion: "idle" },
    error: { expression: "neutral", motion: "idle" },
  };
  return map[state];
};

export const getVisibleNotifications = (
  notifications: NotificationItemData[],
  maxItems = 3,
) => notifications.slice(0, Math.max(0, maxItems));

export const getVisibleMessages = (
  messages: ConversationMessage[],
  maxVisible = 5,
) => messages.slice(Math.max(0, messages.length - maxVisible));
