<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

interface Props {
  modelPath?: string;
  speaking: boolean;
  viseme: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelPath: "models/live2d/mao_pro_zh/runtime/mao_pro.model3.json",
});

const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const stageStatus = ref("loading");

let app: any = null;
let model: any = null;
let baseWidth = 0;
let baseHeight = 0;

const resolveAssetPath = (assetPath: string) => {
  if (/^(?:[a-z]+:)?\/\//i.test(assetPath) || assetPath.startsWith("file:")) {
    return assetPath;
  }
  const normalized = assetPath.replace(/^\/+/, "");
  return new URL(normalized, document.baseURI).toString();
};

const visemeMap: Record<string, number> = {
  a: 1.0,
  i: 0.76,
  u: 0.64,
  e: 0.72,
  o: 0.86,
  sil: 0,
};

const setMouthValue = (value: number) => {
  const coreModel = model?.internalModel?.coreModel;
  if (!coreModel || typeof coreModel.setParameterValueById !== "function") return;
  try {
    coreModel.setParameterValueById("ParamA", value);
  } catch {
    // ignore if parameter does not exist
  }
};

const applyLipSync = () => {
  if (!model) return;
  if (!props.speaking) {
    setMouthValue(0);
    return;
  }
  setMouthValue(visemeMap[props.viseme] ?? 0.48);
};

watch(
  () => [props.speaking, props.viseme] as const,
  () => {
    applyLipSync();
  },
);

const updateLayout = () => {
  if (!app || !model || !containerRef.value) return;
  const width = Math.max(containerRef.value.clientWidth, 320);
  const height = Math.max(containerRef.value.clientHeight, 320);

  app.renderer.resize(width, height);

  const targetWidth = width * 1.14;
  const targetHeight = height * 1.28;
  const scaleX = targetWidth / Math.max(baseWidth, 1);
  const scaleY = targetHeight / Math.max(baseHeight, 1);
  const scale = Math.min(scaleX, scaleY);

  model.scale.set(scale);
  model.x = width / 2;
  model.y = height * 0.55;
};

const loadLive2D = async () => {
  if (!canvasRef.value || !containerRef.value) return;

  const PIXI = window.PIXI;
  const Live2DModel = PIXI?.live2d?.Live2DModel;
  if (!PIXI || !Live2DModel) {
    stageStatus.value = "Live2D libs missing";
    return;
  }

  app = new PIXI.Application({
    view: canvasRef.value,
    width: containerRef.value.clientWidth || 420,
    height: containerRef.value.clientHeight || 420,
    backgroundAlpha: 0,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    antialias: true,
  });

  try {
    model = await Live2DModel.from(resolveAssetPath(props.modelPath), {
      autoInteract: false,
      autoUpdate: true,
    });
    app.stage.addChild(model);
    model.anchor.set(0.5, 0.5);
    model.scale.set(1);
    baseWidth = model.width || 1000;
    baseHeight = model.height || 1000;
    updateLayout();
    stageStatus.value = "ready";
  } catch (error) {
    stageStatus.value = `Load failed: ${String(error)}`;
    return;
  }

  window.addEventListener("resize", updateLayout);
};

const playMotionAlias = (alias: string) => {
  if (!model || typeof model.motion !== "function") return;

  const map: Record<string, { group: string; index: number }> = {
    idle_bounce: { group: "Idle", index: 0 },
    mtn_01: { group: "Idle", index: 0 },
    mtn_02: { group: "", index: 0 },
    mtn_03: { group: "", index: 1 },
    mtn_04: { group: "", index: 2 },
    special_01: { group: "", index: 3 },
    special_02: { group: "", index: 4 },
    special_03: { group: "", index: 5 },
    wave: { group: "", index: 0 },
  };
  const target = map[alias] ?? map.idle_bounce;
  try {
    model.motion(target.group, target.index, 3);
  } catch {
    model.motion("Idle", 0, 3);
  }
};

const setExpressionAlias = (alias: string) => {
  if (!model || typeof model.expression !== "function") return;
  const map: Record<string, string> = {
    exp_01: "exp_01",
    exp_02: "exp_02",
    exp_03: "exp_03",
    exp_04: "exp_04",
    exp_05: "exp_05",
    exp_06: "exp_06",
    exp_07: "exp_07",
    exp_08: "exp_08",
    normal: "exp_01",
    neutral: "exp_01",
    listening: "exp_01",
    focus: "exp_01",
    happy: "exp_02",
    smile: "exp_02",
    joy: "exp_02",
    sleepy: "exp_03",
    thinking: "exp_03",
    excited: "exp_04",
    sad: "exp_05",
    sorry: "exp_05",
    concern: "exp_05",
    shy: "exp_06",
    surprised: "exp_07",
    curious: "exp_07",
    angry: "exp_08",
  };
  const expressionId = map[alias] ?? "exp_01";
  try {
    model.expression(expressionId);
  } catch {
    // ignore unsupported expression id
  }
};

defineExpose({
  playMotionAlias,
  setExpressionAlias,
});

onMounted(() => {
  loadLive2D();
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateLayout);
  if (app) {
    app.destroy(true, { children: true, texture: true, baseTexture: true });
  }
  app = null;
  model = null;
});
</script>

<template>
  <div ref="containerRef" class="live2d-shell">
    <canvas ref="canvasRef" class="live2d-canvas"></canvas>
    <div v-if="stageStatus !== 'ready'" class="live2d-overlay">
      {{ stageStatus }}
    </div>
  </div>
</template>

<style scoped>
.live2d-shell {
  position: relative;
  width: 100%;
  height: clamp(300px, 58vh, 480px);
  min-height: 300px;
  max-height: 480px;
}

.live2d-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.live2d-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  font-size: 13px;
  color: #9fb1d8;
  background: rgba(8, 14, 24, 0.5);
}

@media (max-height: 520px) {
  .live2d-shell {
    height: 248px;
    min-height: 248px;
    max-height: 248px;
  }
}
</style>
