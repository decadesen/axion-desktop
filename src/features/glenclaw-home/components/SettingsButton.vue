<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
  }>(),
  {
    label: "设置",
  },
);

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <button class="settings-button" type="button" @click="emit('click')">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.9 14.1 5l2.9-.8 1.6 2.8-2.1 2.1.8 2.9-2.8 1.6-2.1-2.1-2.9.8-1.6-2.8L10 7.4 9.2 4.5z" />
      <circle cx="12" cy="9.8" r="3.2" />
    </svg>
    <span>{{ label }}</span>
    <i aria-hidden="true"></i>
  </button>
</template>

<style scoped>
.settings-button {
  width: 100%;
  min-height: clamp(72px, 11vh, 104px);
  display: grid;
  grid-template-columns: clamp(42px, 4.4vw, 58px) minmax(0, 1fr) 24px;
  gap: clamp(12px, 1.8vw, 22px);
  align-items: center;
  padding: clamp(13px, 1.8vw, 22px);
  border: 1px solid rgba(165, 196, 236, 0.42);
  border-radius: 20px;
  color: #f4f8ff;
  cursor: pointer;
  background:
    radial-gradient(180px 90px at 22% 0%, rgba(130, 182, 238, 0.16), transparent 72%),
    linear-gradient(180deg, rgba(9, 22, 39, 0.8), rgba(3, 12, 22, 0.82));
  box-shadow:
    0 0 34px rgba(31, 140, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.settings-button:hover {
  border-color: rgba(24, 231, 255, 0.54);
  box-shadow:
    0 0 38px rgba(24, 231, 255, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

svg {
  width: clamp(38px, 4.2vw, 56px);
  height: clamp(38px, 4.2vw, 56px);
  fill: none;
  stroke: rgba(233, 240, 255, 0.88);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

span {
  color: rgba(250, 253, 255, 0.96);
  font-size: clamp(21px, 2.2vw, 30px);
}

i {
  width: 18px;
  height: 18px;
  border-right: 3px solid rgba(233, 240, 255, 0.72);
  border-bottom: 3px solid rgba(233, 240, 255, 0.72);
  transform: rotate(-45deg);
}

@media (max-width: 860px), (max-height: 520px) {
  .settings-button {
    min-height: 54px;
    grid-template-columns: 32px minmax(0, 1fr) 14px;
    gap: 8px;
    padding: 9px 10px;
    border-radius: 15px;
  }

  svg {
    width: 30px;
    height: 30px;
  }

  span {
    font-size: 16px;
  }

  i {
    width: 12px;
    height: 12px;
    border-width: 2px;
  }
}
</style>
