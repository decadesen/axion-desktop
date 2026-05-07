import { describe, expect, it } from "vitest";
import { deriveCharacterState, getVisibleMessages, getVisibleNotifications } from "../../src/features/glenclaw-home/state";
import type { ConversationMessage, NotificationItemData } from "../../src/features/glenclaw-home/types";

describe("glenclaw home state helpers", () => {
  it("maps assistant states to character expression and motion", () => {
    expect(deriveCharacterState("standby")).toEqual({ expression: "smile", motion: "idle" });
    expect(deriveCharacterState("listening")).toEqual({ expression: "listening", motion: "listen" });
    expect(deriveCharacterState("thinking")).toEqual({ expression: "thinking", motion: "think" });
    expect(deriveCharacterState("replying")).toEqual({ expression: "speaking", motion: "speak" });
    expect(deriveCharacterState("offline")).toEqual({ expression: "neutral", motion: "idle" });
    expect(deriveCharacterState("error")).toEqual({ expression: "neutral", motion: "idle" });
  });

  it("limits notifications from the beginning of the list", () => {
    const notifications = Array.from({ length: 5 }, (_, index): NotificationItemData => ({
      id: `n${index}`,
      type: "message",
      title: `Notification ${index}`,
      time: "09:32",
    }));

    expect(getVisibleNotifications(notifications, 3).map((item) => item.id)).toEqual(["n0", "n1", "n2"]);
    expect(getVisibleNotifications(notifications, 0)).toEqual([]);
  });

  it("keeps the latest messages for the right conversation rail", () => {
    const messages = Array.from({ length: 7 }, (_, index): ConversationMessage => ({
      id: `m${index}`,
      role: index % 2 === 0 ? "assistant" : "user",
      content: `Message ${index}`,
      time: "09:32",
    }));

    expect(getVisibleMessages(messages, 4).map((item) => item.id)).toEqual(["m3", "m4", "m5", "m6"]);
    expect(getVisibleMessages(messages, 0)).toEqual([]);
  });
});
