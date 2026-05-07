# Axion-desktop

一个基于 `Electron + Vite + Vue3` 的桌面应用壳，内置模拟 WebSocket 后端，便于本地验证协议与界面流程。

## 快速开始

```bash
npm install
npm run dev
```

`npm run dev` 会启动三个进程：

- Vite 界面：`http://127.0.0.1:5173`
- 模拟 WebSocket 后端：`ws://127.0.0.1:18765/ws`
- Electron 桌面窗口

## 协议

- 协议文档：`docs/ws-protocol.md`
- TypeScript 接口：`src/protocol.ts`

## 使用自己的后端

运行前设置环境变量：

```bash
PET_WS_URL=ws://127.0.0.1:9000/ws npm run dev
PET_USE_MOCK=false npm run dev
```

PowerShell 示例：

```powershell
$env:PET_WS_URL = "ws://127.0.0.1:9000/ws"
$env:PET_USE_MOCK = "false"
npm run dev
```

## 关键目录

- `electron/`：Electron 主进程与 preload 桥接
- `mock-server/`：本地协议测试用的模拟后端
- `src/composables/usePetSocket.ts`：Socket 状态管理
- `src/protocol.ts`：消息信封与接口定义
