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

## 本机 Box 鉴权

Axion-desktop 和 `axion-box` 部署在同一台设备时，前端通过 Electron preload 读取 Box 生成的 `static-token.json`，并使用其中的 static token 请求本机 Box。绑定检查只判断设备是否已经绑定；未绑定时显示绑定二维码，已绑定后直接进入主界面，不再走额外登录流程。

默认配置：

```bash
PET_BOX_URL=http://127.0.0.1:26681
AXION_BOX_STATIC_TOKEN_PATH=/srv/axion-box/var/static-token.json
```

也兼容旧变量名：

```bash
PET_BOX_STATIC_TOKEN_PATH=/srv/axion-box/var/static-token.json
PET_BOX_STATIC_TOKEN_WSL_DISTRO=
```

Windows 本地调试如果需要通过 WSL 读取 Linux 路径，可以配置：

```powershell
$env:PET_BOX_URL = "http://192.168.209.231:26681"
$env:AXION_BOX_STATIC_TOKEN_PATH = "/opt/source/axion-box/var/static-token.json"
$env:AXION_BOX_STATIC_TOKEN_WSL_DISTRO = "Ubuntu"
npm run dev
```

## 关键目录

- `electron/`：Electron 主进程与 preload 桥接
- `mock-server/`：本地协议测试用的模拟后端
- `src/composables/usePetSocket.ts`：Socket 状态管理
- `src/protocol.ts`：消息信封与接口定义
