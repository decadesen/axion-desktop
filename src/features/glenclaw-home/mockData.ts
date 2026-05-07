import avatarHero from "../../assets/hero.png";
import type { ConversationMessage, NotificationItemData } from "./types";

export const glenclawAssistantAvatar = avatarHero;

export const mockUserAvatar =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Cdefs%3E%3CradialGradient id='g' cx='42%25' cy='30%25' r='68%25'%3E%3Cstop stop-color='%23364b64'/%3E%3Cstop offset='1' stop-color='%2308121e'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='96' height='96' rx='48' fill='url(%23g)'/%3E%3Ccircle cx='48' cy='35' r='16' fill='%23d8e6f3'/%3E%3Cpath d='M20 82c6-20 18-31 28-31s22 11 28 31' fill='%23d8e6f3'/%3E%3C/svg%3E";

export const mockNotifications: NotificationItemData[] = [
  {
    id: "n1",
    type: "message",
    title: "新消息",
    description: "你有一条新消息",
    time: "09:28",
    unread: true,
  },
  {
    id: "n2",
    type: "schedule",
    title: "项目会议",
    description: "今天 10:00",
    time: "10:00",
    unread: true,
  },
  {
    id: "n3",
    type: "weather",
    title: "天气",
    description: "24°C 多云",
    time: "08:45",
    unread: true,
  },
];

export const mockMessages: ConversationMessage[] = [
  {
    id: "m1",
    role: "assistant",
    content: "早上好！今天需要我帮你做什么？",
    time: "09:30",
    highlight: true,
  },
  {
    id: "m2",
    role: "user",
    content: "今天的日程有哪些？",
    time: "09:31",
  },
  {
    id: "m3",
    role: "assistant",
    content: "你上午 10:00 有项目会议，下午 2:00 有评审会。",
    time: "09:31",
    highlight: true,
  },
  {
    id: "m4",
    role: "user",
    content: "提醒我跟进设计团队。",
    time: "09:32",
  },
  {
    id: "m5",
    role: "assistant",
    content: "好的，我会在 11:00 提醒你。",
    time: "09:32",
    highlight: true,
    audioWave: true,
  },
  {
    id: "m6",
    role: "user",
    content: "我演示时让首页保持安静。",
    time: "09:33",
  },
  {
    id: "m7",
    role: "assistant",
    content: "演示专注模式已开启，10:45 前通知会保持低调。",
    time: "09:33",
    highlight: true,
  },
  {
    id: "m8",
    role: "user",
    content: "帮我确认设计评审会议室是否已预订。",
    time: "09:34",
  },
  {
    id: "m9",
    role: "assistant",
    content: "A-204 会议室已为评审预订，时间是 14:00 到 15:00。",
    time: "09:34",
    highlight: true,
  },
  {
    id: "m10",
    role: "user",
    content: "开始前十分钟提醒我。",
    time: "09:35",
  },
  {
    id: "m11",
    role: "assistant",
    content: "已设置，我会在 13:50 提醒你，并置顶这条备注。",
    time: "09:35",
    highlight: true,
  },
];
