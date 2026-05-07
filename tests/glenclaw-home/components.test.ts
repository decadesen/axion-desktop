import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import CharacterStage from "../../src/features/glenclaw-home/components/CharacterStage.vue";
import ConversationBubbleArea from "../../src/features/glenclaw-home/components/ConversationBubbleArea.vue";
import GlenclawHomePage from "../../src/features/glenclaw-home/GlenclawHomePage.vue";
import NotificationItem from "../../src/features/glenclaw-home/components/NotificationItem.vue";
import NotificationList from "../../src/features/glenclaw-home/components/NotificationList.vue";
import TimeCard from "../../src/features/glenclaw-home/components/TimeCard.vue";
import VoiceInputIndicator from "../../src/features/glenclaw-home/components/VoiceInputIndicator.vue";
import { mockMessages, mockNotifications, mockUserAvatar } from "../../src/features/glenclaw-home/mockData";
import type { ConversationMessage } from "../../src/features/glenclaw-home/types";

const assistantAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";

const live2DStub = {
  name: "Live2DStage",
  template: "<div class='live2d-stub' />",
  methods: {
    playMotionAlias: vi.fn(),
    setExpressionAlias: vi.fn(),
  },
};

describe("glenclaw home components", () => {
  it("renders the time card in 24 hour format with date", () => {
    const wrapper = mount(TimeCard, {
      props: {
        time: new Date("2026-04-24T09:32:00"),
      },
    });

    expect(wrapper.text()).toContain("09:32");
    expect(wrapper.text()).toContain("APR");
    expect(wrapper.text()).toContain("FRI");
  });

  it("supports compact 12 hour time without the date line", () => {
    const wrapper = mount(TimeCard, {
      props: {
        time: new Date("2026-04-24T21:32:00"),
        format: "12h",
        showDate: false,
      },
    });

    expect(wrapper.text()).toContain("09:32");
    expect(wrapper.text()).not.toContain("APR");
  });

  it("renders every notification icon branch and emits from item clicks", async () => {
    const types = ["message", "schedule", "weather", "system", "warning"] as const;

    for (const type of types) {
      const wrapper = mount(NotificationItem, {
        props: {
          item: {
            id: type,
            type,
            title: type,
            time: "09:32",
          },
        },
      });

      expect(wrapper.find(`.type-${type}`).exists()).toBe(true);
      await wrapper.trigger("click");
      expect(wrapper.emitted("click")?.[0]).toEqual([type]);
    }
  });

  it("limits notifications and emits clicked notification id", async () => {
    const wrapper = mount(NotificationList, {
      props: {
        notifications: mockNotifications,
        maxItems: 2,
      },
    });

    expect(wrapper.findAll(".notification-item")).toHaveLength(2);
    await wrapper.findAll(".notification-item")[1].trigger("click");
    expect(wrapper.emitted("itemClick")?.[0]).toEqual(["n2"]);
  });

  it("emits voice events and switches visual state class", async () => {
    const wrapper = mount(VoiceInputIndicator, {
      props: {
        state: "listening",
        level: 0.8,
      },
    });

    expect(wrapper.classes()).toContain("state-listening");
    expect(wrapper.text()).toContain("Listening");

    await wrapper.trigger("pointerdown");
    await wrapper.trigger("pointerup");
    await wrapper.trigger("click");

    expect(wrapper.emitted("start")).toHaveLength(1);
    expect(wrapper.emitted("stop")).toHaveLength(1);
    expect(wrapper.emitted("click")).toHaveLength(1);
  });

  it("renders only the latest conversation bubbles and keeps avatars on the right", async () => {
    const messages: ConversationMessage[] = [
      ...mockMessages,
      { id: "m6", role: "user", content: "Also prepare the Q2 report draft.", time: "09:33" },
    ];
    const wrapper = mount(ConversationBubbleArea, {
      props: {
        messages,
        assistantAvatarUrl: assistantAvatar,
        userAvatarUrl: mockUserAvatar,
        maxVisible: 4,
      },
    });

    expect(wrapper.findAll(".conversation-row")).toHaveLength(4);
    expect(wrapper.text()).not.toContain("Good morning");
    expect(wrapper.text()).toContain("Q2 report");
    expect(wrapper.findAll(".avatar")).toHaveLength(4);

    await wrapper.find(".conversation-bubble").trigger("click");
    expect(wrapper.emitted("messageClick")?.[0]).toEqual(["m3"]);
  });

  it("wires character stage voice events and renders drone by default", async () => {
    const wrapper = mount(CharacterStage, {
      props: {
        assistantState: "replying",
        voiceLevel: 0.7,
      },
      global: {
        stubs: {
          Live2DStage: live2DStub,
        },
      },
    });

    expect(wrapper.classes()).toContain("state-replying");
    expect(wrapper.find(".companion-drone").exists()).toBe(true);

    await wrapper.findComponent(VoiceInputIndicator).trigger("click");
    await wrapper.findComponent(VoiceInputIndicator).trigger("pointerdown");
    await wrapper.findComponent(VoiceInputIndicator).trigger("pointerup");
    await wrapper.find(".live2d-character").trigger("click");

    expect(wrapper.emitted("voiceClick")).toHaveLength(1);
    expect(wrapper.emitted("voiceStart")).toHaveLength(1);
    expect(wrapper.emitted("voiceStop")).toHaveLength(1);
    expect(wrapper.emitted("characterClick")).toHaveLength(1);
  });

  it("can hide the companion drone and render a static character image", () => {
    const wrapper = mount(CharacterStage, {
      props: {
        assistantState: "offline",
        showDrone: false,
        characterImageUrl: assistantAvatar,
      },
    });

    expect(wrapper.find(".companion-drone").exists()).toBe(false);
    expect(wrapper.find("img[alt='Glenclaw character']").exists()).toBe(true);
  });

  it("composes the full desktop layout and forwards primary events", async () => {
    const wrapper = mount(GlenclawHomePage, {
      props: {
        currentTime: new Date("2026-04-24T09:32:00"),
        assistantState: "standby",
        notifications: mockNotifications,
        messages: mockMessages,
        assistantAvatarUrl: assistantAvatar,
        userAvatarUrl: mockUserAvatar,
      },
      global: {
        stubs: {
          Live2DStage: live2DStub,
        },
      },
    });

    expect(wrapper.find(".left-status-panel").exists()).toBe(true);
    expect(wrapper.find(".character-stage").exists()).toBe(true);
    expect(wrapper.find(".conversation-bubble-area").exists()).toBe(true);

    await wrapper.find(".settings-button").trigger("click");
    await wrapper.find(".notification-item").trigger("click");
    await wrapper.find(".conversation-bubble").trigger("click");
    await wrapper.find(".voice-indicator").trigger("pointerdown");
    await wrapper.find(".voice-indicator").trigger("pointerup");
    await wrapper.find(".voice-indicator").trigger("click");
    await wrapper.find(".live2d-character").trigger("click");

    expect(wrapper.emitted("settingsClick")).toHaveLength(1);
    expect(wrapper.emitted("notificationClick")?.[0]).toEqual(["n1"]);
    expect(wrapper.emitted("messageClick")?.[0]).toEqual(["m1"]);
    expect(wrapper.emitted("voiceStart")).toHaveLength(1);
    expect(wrapper.emitted("voiceStop")).toHaveLength(1);
    expect(wrapper.emitted("voiceClick")).toHaveLength(1);
    expect(wrapper.emitted("characterClick")).toHaveLength(1);
  });
});
