export interface RuntimeBridge {
  version: string;
  platform: string;
  env: {
    wsUrl: string;
    useMockBackend: boolean;
    boxUrl: string;
    boxHost: string;
    boxPort: string;
    desktopConfigPath: string;
    cloudUrl: string;
    cloudHost: string;
    cloudPort: string;
    deviceUrl: string;
  };
}

declare global {
  interface Window {
    runtime: RuntimeBridge;
    axionDevice?: {
      request<T = unknown>(
        path: string,
        options?: {
          method?: "GET" | "POST";
          body?: unknown;
          timeoutMs?: number;
        },
      ): Promise<T>;
    };
    boxStaticToken?: {
      read(): Promise<{
        access_token: string;
        token_type: string;
        scope_token_type: "static" | string;
        subject_ref: string;
        display_name: string;
      }>;
    };
  }
}

export {};
