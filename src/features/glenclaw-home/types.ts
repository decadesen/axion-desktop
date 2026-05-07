export type AssistantState = "standby" | "listening" | "thinking" | "replying" | "offline" | "error";

export type ConversationDisplayMode = "fade" | "wheel";

export type NotificationType = "message" | "schedule" | "weather" | "system" | "warning";

export type NotificationItemData = {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  time: string;
  unread?: boolean;
};

export type MessageRole = "assistant" | "user";

export type ConversationMessage = {
  id: string;
  role: MessageRole;
  content: string;
  time: string;
  status?: "sending" | "sent" | "received" | "error";
  highlight?: boolean;
  audioWave?: boolean;
};

export type Live2DExpression = "neutral" | "smile" | "listening" | "thinking" | "speaking";

export type Live2DMotion = "idle" | "listen" | "think" | "speak";
