<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const taskType = computed(() => String(route.params.taskType || "openclaw"));

const taskTitle = computed(() => {
  const titleMap: Record<string, string> = {
    openclaw: "开放爪任务",
    browser: "浏览器任务",
    file: "文件任务",
    install: "安装任务",
  };
  return titleMap[taskType.value] ?? "任务页面";
});

const timeline = computed(() => [
  { label: "接收任务", status: "done" },
  { label: "分析步骤", status: "done" },
  { label: "等待执行通道", status: "running" },
  { label: "返回结果", status: "pending" },
]);
</script>

<template>
  <main class="task-page">
    <header class="task-header">
      <button class="back-button" type="button" @click="router.push({ name: 'home' })">
        返回首页
      </button>
      <div>
        <span>任务 / {{ taskTitle }}</span>
        <h1>{{ taskTitle }}</h1>
      </div>
    </header>

    <section class="task-body">
      <aside class="task-timeline">
        <article v-for="item in timeline" :key="item.label" class="timeline-item" :class="item.status">
          <i></i>
          <span>{{ item.label }}</span>
        </article>
      </aside>

      <section class="task-surface">
        <span class="surface-kicker">任务面板</span>
        <h2>功能页面容器</h2>
        <p>后续 openclaw、浏览器、文件、安装等功能都可以在这个页面按 `taskType` 扩展。</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.task-page {
  width: 100vw;
  height: 100vh;
  min-width: var(--ax-screen-min-width);
  min-height: var(--ax-screen-min-height);
  overflow: hidden;
  box-sizing: border-box;
  padding: var(--ax-page-padding);
  color: #dcecf2;
  font-family:
    "Noto Sans CJK SC",
    "Noto Sans SC",
    "Microsoft YaHei",
    "PingFang SC",
    "Source Han Sans SC",
    "WenQuanYi Micro Hei",
    "Segoe UI",
    sans-serif;
  background:
    radial-gradient(circle at 72% 24%, rgba(0, 190, 220, 0.1), transparent 30%),
    linear-gradient(180deg, #02070c 0%, #020b12 100%);
}

.task-header {
  display: flex;
  align-items: center;
  gap: var(--ax-page-gap);
  height: calc(var(--ax-control-height) + var(--ax-page-gap) * 2);
}

.back-button {
  border: 1px solid rgba(93, 185, 202, 0.36);
  border-radius: var(--ax-control-radius);
  min-height: var(--ax-control-height);
  padding: 0 12px;
  color: rgba(214, 242, 248, 0.92);
  background: rgba(6, 24, 33, 0.62);
  cursor: pointer;
}

.task-header span,
.surface-kicker {
  color: rgba(104, 231, 244, 0.9);
  font-size: var(--ax-font-micro);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.task-header h1,
.task-surface h2 {
  margin: 7px 0 0;
  color: rgba(228, 247, 251, 0.96);
  font-size: var(--ax-font-title);
  line-height: 1.1;
}

.task-body {
  display: grid;
  grid-template-columns: minmax(180px, var(--ax-settings-sidebar-width)) minmax(0, 1fr);
  gap: var(--ax-page-gap);
  height: calc(100% - (var(--ax-control-height) + var(--ax-page-gap) * 2));
  min-height: 0;
}

.task-timeline,
.task-surface {
  min-height: 0;
  border: 1px solid rgba(108, 197, 216, 0.36);
  border-radius: var(--ax-panel-radius);
  background:
    radial-gradient(240px 140px at 28% 0%, rgba(81, 162, 184, 0.18), transparent 72%),
    linear-gradient(180deg, rgba(8, 28, 38, 0.76), rgba(3, 14, 21, 0.82));
  box-shadow:
    0 22px 70px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(186, 241, 255, 0.1);
}

.task-timeline {
  padding: var(--ax-panel-padding);
}

.timeline-item {
  display: grid;
  grid-template-columns: 12px 1fr;
  gap: 10px;
  align-items: center;
  min-height: 42px;
  color: rgba(169, 199, 210, 0.82);
  font-size: var(--ax-font-body);
}

.timeline-item i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(104, 231, 244, 0.28);
}

.timeline-item.done i {
  background: #41d6e6;
  box-shadow: 0 0 12px rgba(65, 214, 230, 0.42);
}

.timeline-item.running i {
  background: #f0b35a;
  box-shadow: 0 0 12px rgba(240, 179, 90, 0.42);
}

.task-surface {
  padding: var(--ax-page-padding);
}

.task-surface p {
  max-width: 520px;
  margin: 12px 0 0;
  color: rgba(169, 199, 210, 0.82);
  font-size: var(--ax-font-body);
  line-height: var(--ax-line-body);
}
</style>
