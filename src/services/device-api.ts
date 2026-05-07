import { resolveRuntimeConfig } from "./runtime-config";

type DeviceEnvelope<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error?: {
        code?: string;
        message?: string;
      };
    };

export type DeviceCapabilities = {
  network: boolean;
  wifi: boolean;
  storage: boolean;
  usbEvents: boolean;
  brightness: boolean;
  audio: boolean;
  bluetooth: boolean;
  power: boolean;
};

export type DeviceStatus = {
  hostname: string;
  agentVersion: string;
  uptimeSeconds: number;
  capabilities: DeviceCapabilities;
};

export type NetworkStatus = {
  state: string;
  primary: string;
  wifiEnabled: boolean;
  backend: string;
};

export type WiFiAccessPoint = {
  ssid: string;
  bssid: string;
  strength: number;
  frequency: number;
  security: string;
};

export type WiFiConnectRequest = {
  ssid: string;
  password: string;
  bssid?: string;
  hidden?: boolean;
  remember?: boolean;
};

export type WiFiConnectResult = {
  ssid: string;
  state: string;
  active: boolean;
};

export type USBDevice = {
  deviceId: string;
  vendorId: string;
  productId: string;
  manufacturer: string;
  product: string;
  serial: string;
  class: string;
};

export type StorageDevice = {
  deviceId: string;
  name: string;
  label: string;
  filesystem: string;
  sizeBytes: number;
  removable: boolean;
  mounted: boolean;
  mountPath: string;
};

export type StorageActionResult = {
  deviceId: string;
  mountPath?: string;
  status: string;
};

export type DisplayStatus = {
  displayId: string;
  percent: number;
  raw: number;
  max: number;
  backend: string;
};

export type AudioStatus = {
  sink: string;
  percent: number;
  muted: boolean;
  backend: string;
};

const { deviceBaseUrl } = resolveRuntimeConfig();

const unwrapEnvelope = <T>(envelope: DeviceEnvelope<T>): T => {
  if (envelope?.ok === true) {
    return envelope.data;
  }

  const message = envelope?.ok === false ? envelope.error?.message || envelope.error?.code : "";
  throw new Error(message || "axion-device request failed");
};

const requestDevice = async <T>(path: string, options: { method?: "GET" | "POST"; body?: unknown } = {}) => {
  if (window.axionDevice) {
    const envelope = await window.axionDevice.request<DeviceEnvelope<T>>(path, {
      method: options.method ?? "GET",
      body: options.body,
      timeoutMs: 12000,
    });
    return unwrapEnvelope(envelope);
  }

  const response = await fetch(`${deviceBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const envelope = (await response.json()) as DeviceEnvelope<T>;
  return unwrapEnvelope(envelope);
};

export const deviceApi = {
  health: () => requestDevice<{ name: string; status: string }>("/api/v1/health"),
  status: () => requestDevice<DeviceStatus>("/api/v1/device/status"),
  capabilities: () => requestDevice<DeviceCapabilities>("/api/v1/device/capabilities"),
  networkStatus: () => requestDevice<NetworkStatus>("/api/v1/network/status"),
  scanWiFi: () => requestDevice<WiFiAccessPoint[]>("/api/v1/network/wifi/scan"),
  connectWiFi: (body: WiFiConnectRequest) =>
    requestDevice<WiFiConnectResult>("/api/v1/network/wifi/connect", { method: "POST", body }),
  disconnectWiFi: () =>
    requestDevice<{ status: string }>("/api/v1/network/wifi/disconnect", { method: "POST", body: {} }),
  forgetWiFi: (ssid: string) =>
    requestDevice<{ status: string }>("/api/v1/network/wifi/forget", { method: "POST", body: { ssid } }),
  listUSB: () => requestDevice<USBDevice[]>("/api/v1/usb/devices"),
  listStorage: () => requestDevice<StorageDevice[]>("/api/v1/storage/devices"),
  mountStorage: (deviceId: string) =>
    requestDevice<StorageActionResult>("/api/v1/storage/mount", { method: "POST", body: { deviceId } }),
  unmountStorage: (deviceId: string) =>
    requestDevice<StorageActionResult>("/api/v1/storage/unmount", { method: "POST", body: { deviceId } }),
  ejectStorage: (deviceId: string) =>
    requestDevice<StorageActionResult>("/api/v1/storage/eject", { method: "POST", body: { deviceId } }),
  displayStatus: () => requestDevice<DisplayStatus>("/api/v1/display/status"),
  setBrightness: (displayId: string, percent: number) =>
    requestDevice<DisplayStatus>("/api/v1/display/brightness", { method: "POST", body: { displayId, percent } }),
  audioStatus: () => requestDevice<AudioStatus>("/api/v1/audio/status"),
  setVolume: (sink: string, percent: number) =>
    requestDevice<AudioStatus>("/api/v1/audio/volume", { method: "POST", body: { sink, percent } }),
  setMute: (sink: string, muted: boolean) =>
    requestDevice<AudioStatus>("/api/v1/audio/mute", { method: "POST", body: { sink, muted } }),
};
