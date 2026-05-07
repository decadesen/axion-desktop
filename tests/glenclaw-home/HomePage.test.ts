import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import HomePage from "../../src/pages/HomePage.vue";
import GlenclawHomePage from "../../src/features/glenclaw-home/GlenclawHomePage.vue";

const push = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

describe("HomePage", () => {
  it("passes mock data into the Glenclaw page and routes to settings", async () => {
    const wrapper = mount(HomePage, {
      global: {
        stubs: {
          Live2DStage: true,
        },
      },
    });

    const page = wrapper.findComponent(GlenclawHomePage);
    expect(page.exists()).toBe(true);
    expect(page.props("assistantState")).toBe("standby");
    expect(page.props("notifications")).toHaveLength(3);
    expect(page.props("messages")).toHaveLength(5);

    await wrapper.find(".settings-button").trigger("click");
    expect(push).toHaveBeenCalledWith({ name: "settings" });
  });

  it("cycles assistant state through the mock interaction flow", async () => {
    const wrapper = mount(HomePage, {
      global: {
        stubs: {
          Live2DStage: true,
        },
      },
    });

    const page = () => wrapper.findComponent(GlenclawHomePage);
    expect(page().props("assistantState")).toBe("standby");

    await wrapper.find(".voice-indicator").trigger("click");
    expect(page().props("assistantState")).toBe("listening");

    await wrapper.find(".voice-indicator").trigger("click");
    expect(page().props("assistantState")).toBe("replying");

    await wrapper.find(".voice-indicator").trigger("click");
    expect(page().props("assistantState")).toBe("standby");

    await wrapper.find(".voice-indicator").trigger("pointerdown");
    expect(page().props("assistantState")).toBe("listening");

    await wrapper.find(".voice-indicator").trigger("pointerup");
    expect(page().props("assistantState")).toBe("replying");

    wrapper.unmount();
  });
});
