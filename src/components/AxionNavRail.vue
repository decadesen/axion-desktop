<script setup lang="ts">
import { computed } from "vue";

export type NavRailItem = {
  key: string;
  label: string;
  icon?: "home" | "agent" | "memory" | "tools" | "settings";
  disabled?: boolean;
};

const defaultItems: NavRailItem[] = [
  { key: "home", label: "首页", icon: "home" },
  { key: "agent", label: "智能体", icon: "agent" },
  { key: "memory", label: "记忆", icon: "memory" },
  { key: "tools", label: "工具", icon: "tools" },
  { key: "settings", label: "设置", icon: "settings" },
];

const props = withDefaults(
  defineProps<{
    items?: NavRailItem[];
    activeKey?: string;
    width?: number | string;
    gap?: number;
  }>(),
  {
    activeKey: "home",
    width: 84,
    gap: 12,
  },
);

const emit = defineEmits<{
  select: [key: string];
}>();

const normalizeSize = (value: number | string) =>
  typeof value === "number" ? `${value}px` : value;

const handleSelect = (item: NavRailItem) => {
  if (item.disabled) return;
  emit("select", item.key);
};

const iconNameFor = (item: NavRailItem) => item.icon ?? (item.key as NavRailItem["icon"]);
const resolvedItems = computed(() => props.items ?? defaultItems);
</script>

<template>
  <nav
    class="axion-nav-rail"
    :style="{ width: normalizeSize(width), '--rail-gap': `${gap}px` }"
    aria-label="主导航"
  >
    <button
      v-for="item in resolvedItems"
      :key="item.key"
      class="nav-item"
      :class="{
        active: item.key === activeKey,
        disabled: item.disabled,
      }"
      type="button"
      :aria-current="item.key === activeKey ? 'page' : undefined"
      :disabled="item.disabled"
      @click="handleSelect(item)"
    >
      <span class="nav-icon" aria-hidden="true">
        <svg
          v-if="iconNameFor(item) === 'home'"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M4.5 11.2L12 4.75L19.5 11.2V18.25C19.5 18.6642 19.1642 19 18.75 19H14.75V14.5H9.25V19H5.25C4.83579 19 4.5 18.6642 4.5 18.25V11.2Z"
            stroke="currentColor"
            stroke-width="1.65"
            stroke-linejoin="round"
          />
        </svg>

        <svg
          v-else-if="iconNameFor(item) === 'agent'"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 4L18.5 7.75V16.25L12 20L5.5 16.25V7.75L12 4Z"
            stroke="currentColor"
            stroke-width="1.55"
            stroke-linejoin="round"
          />
          <path
            d="M8.75 10.25L12 12.2L15.25 10.25"
            stroke="currentColor"
            stroke-width="1.55"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        <svg
          v-else-if="iconNameFor(item) === 'memory'"
          viewBox="0 0 24 24"
          fill="none"
        >
          <rect
            x="5.25"
            y="5.25"
            width="13.5"
            height="13.5"
            rx="1.75"
            stroke="currentColor"
            stroke-width="1.55"
          />
          <path
            d="M8 9H16M8 12H16M8 15H12.75"
            stroke="currentColor"
            stroke-width="1.55"
            stroke-linecap="round"
          />
        </svg>

        <svg
          v-else-if="iconNameFor(item) === 'tools'"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M14.8 6.2C15.95 5.05 17.75 4.78 19.2 5.38L16.15 8.45L18.55 10.85L21.62 7.8C22.22 9.25 21.95 11.05 20.8 12.2C19.38 13.62 17.12 13.82 15.47 12.8L9.1 19.17C8.22 20.05 6.8 20.05 5.92 19.17C5.04 18.29 5.04 16.87 5.92 15.99L12.29 9.62C11.28 7.97 11.48 5.72 12.9 4.3"
            stroke="currentColor"
            stroke-width="1.55"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        <svg
          v-else
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 4.75L13.65 5.56L15.47 5.32L16.38 6.92L18.08 7.62L17.84 9.44L19 10.75L17.84 12.06L18.08 13.88L16.38 14.58L15.47 16.18L13.65 15.94L12 16.75L10.35 15.94L8.53 16.18L7.62 14.58L5.92 13.88L6.16 12.06L5 10.75L6.16 9.44L5.92 7.62L7.62 6.92L8.53 5.32L10.35 5.56L12 4.75Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <circle
            cx="12"
            cy="10.75"
            r="2.65"
            stroke="currentColor"
            stroke-width="1.5"
          />
        </svg>
      </span>

      <span class="nav-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.axion-nav-rail {
  --rail-gap: 12px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--rail-gap, var(--ax-panel-gap));
  padding: var(--ax-panel-gap) 10px;
  border-radius: var(--ax-panel-radius);
  border: 1px solid transparent;
  background:
    linear-gradient(rgba(5, 18, 26, 0.84), rgba(4, 16, 23, 0.84)) padding-box,
    linear-gradient(
      180deg,
      rgba(88, 152, 172, 0.4) 0%,
      rgba(46, 88, 108, 0.24) 48%,
      rgba(84, 148, 168, 0.22) 100%
    ) border-box;
  box-shadow:
    0 22px 48px rgba(0, 0, 0, 0.34),
    inset 0 1px 0 rgba(170, 224, 236, 0.06),
    inset 0 0 26px rgba(34, 128, 156, 0.06);
  backdrop-filter: blur(18px) saturate(118%);
  -webkit-backdrop-filter: blur(18px) saturate(118%);
}

.axion-nav-rail::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background:
    radial-gradient(
      74px 140px at 0% 18%,
      rgba(71, 145, 166, 0.12) 0%,
      transparent 82%
    ),
    radial-gradient(
      78px 180px at 100% 64%,
      rgba(48, 118, 140, 0.08) 0%,
      transparent 82%
    ),
    linear-gradient(
      180deg,
      rgba(14, 36, 48, 0.28) 0%,
      rgba(4, 15, 22, 0) 24%
    );
}

.nav-item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: calc(var(--ax-control-height) + 28px);
  padding: 12px 6px 10px;
  border: 0;
  border-radius: 18px;
  background: transparent;
  color: rgba(169, 193, 204, 0.72);
  transition:
    color 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
  cursor: pointer;
}

.nav-item:hover:not(.disabled):not(.active) {
  color: rgba(195, 221, 232, 0.9);
  background:
    linear-gradient(
      180deg,
      rgba(16, 40, 52, 0.58) 0%,
      rgba(7, 22, 30, 0.46) 100%
    );
}

.nav-item:active:not(.disabled) {
  transform: translateY(1px);
}

.nav-item.active {
  color: #7feeff;
  background:
    radial-gradient(
      74px 42px at 50% 18%,
      rgba(112, 246, 255, 0.24) 0%,
      rgba(77, 185, 208, 0.12) 48%,
      transparent 100%
    ),
    linear-gradient(
      180deg,
      rgba(19, 67, 82, 0.88) 0%,
      rgba(8, 32, 42, 0.82) 100%
    );
  box-shadow:
    inset 0 0 0 1px rgba(114, 214, 232, 0.26),
    inset 0 1px 0 rgba(214, 255, 255, 0.08),
    0 0 22px rgba(45, 192, 214, 0.16);
}

.nav-item.disabled {
  opacity: 0.34;
  cursor: not-allowed;
}

.nav-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.nav-icon svg {
  width: 24px;
  height: 24px;
}

.nav-label {
  font-size: var(--ax-font-micro);
  line-height: 1;
  letter-spacing: 0.01em;
}

@media (max-width: 900px), (max-height: 540px) {
  .nav-item {
    min-height: calc(var(--ax-control-height) + 16px);
    gap: 5px;
    padding: 8px 4px;
    border-radius: var(--ax-control-radius);
  }

  .nav-icon,
  .nav-icon svg {
    width: 20px;
    height: 20px;
  }
}
</style>
