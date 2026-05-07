<template>
  <section class="qr-section">
    <div class="qr-frame">
      <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" :alt="altText" />
      <span v-else>正在生成二维码</span>
    </div>
    <p class="qr-hint">{{ hint }}</p>
    <div class="actions qr-actions">
      <button type="button" @click="emit('refresh')">刷新二维码</button>
      <button v-if="activeUrl" type="button" @click="emit('open')">打开链接</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import QRCode from "qrcode";
import { ref, watch } from "vue";

const props = defineProps<{
  activeUrl: string;
  altText: string;
  hint: string;
}>();

const emit = defineEmits<{
  refresh: [];
  open: [];
}>();

const qrCodeDataUrl = ref("");

watch(
  () => props.activeUrl,
  async (nextUrl) => {
    qrCodeDataUrl.value = nextUrl
      ? await QRCode.toDataURL(nextUrl, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 280,
          color: {
            dark: "#05141b",
            light: "#f4fdff",
          },
        })
      : "";
  },
  { immediate: true },
);
</script>

<style scoped>
.qr-section {
  display: grid;
  justify-items: center;
  gap: var(--ax-panel-gap);
  margin: 6px 0 var(--ax-panel-gap);
}

.qr-frame {
  width: min(var(--ax-qr-size), 44vh, 78vw);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: var(--ax-qr-padding);
  border-radius: var(--ax-panel-radius);
  border: 1px solid rgba(127, 232, 245, 0.46);
  background: #f4fdff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
}

.qr-frame img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-frame span {
  color: #05141b;
  font-weight: 700;
}

.qr-hint {
  margin: 0;
  color: rgba(198, 225, 232, 0.82);
  font-size: var(--ax-font-caption);
  line-height: var(--ax-line-body);
  text-align: center;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ax-panel-gap);
}

.qr-actions {
  justify-content: center;
  margin-top: 0;
}

button {
  height: var(--ax-control-height);
  box-sizing: border-box;
  border: 1px solid rgba(93, 185, 202, 0.36);
  border-radius: var(--ax-control-radius);
  padding: 0 14px;
  color: rgba(214, 242, 248, 0.95);
  background: rgba(7, 32, 47, 0.86);
  cursor: pointer;
  font-size: var(--ax-font-body);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-height: 640px) {
  .qr-frame {
    width: min(var(--ax-qr-size), 38vh, 72vw);
  }

  button {
    height: var(--ax-control-height);
  }
}

@media (max-height: 520px) {
  .qr-frame {
    width: min(var(--ax-qr-size), 34vh, 68vw);
  }
}

@media (max-height: 520px) and (min-width: 560px) {
  .qr-section {
    grid-column: 2;
    grid-row: 1 / span 4;
    align-self: center;
    gap: 6px;
    margin: 0;
  }

  .qr-frame {
    width: min(var(--ax-qr-size), 52vh, 34vw);
  }

  .qr-hint {
    line-height: 1.25;
  }

  .qr-actions {
    flex-wrap: nowrap;
    gap: 8px;
  }

  .qr-actions button {
    height: var(--ax-control-height);
    padding: 0 10px;
    white-space: nowrap;
  }
}
</style>
