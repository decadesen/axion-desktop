import { reactive, readonly } from "vue";
import { resolveRuntimeConfig } from "../runtime-config";
import type { AuthContext, AuthStage, BoxInitInfo, BoxSession, CloudWebAuthFlow } from "./types";

const runtimeConfig = resolveRuntimeConfig();

const context = reactive<AuthContext>({
  stage: "checking",
  boxBaseUrl: runtimeConfig.boxBaseUrl,
  cloudBaseUrl: runtimeConfig.cloudBaseUrl,
  session: null,
  initInfo: null,
  authFlow: null,
  lastError: null,
});

export const authState = readonly(context);

export const setAuthStage = (stage: AuthStage, error: string | null = null): void => {
  context.stage = stage;
  context.lastError = error;
};

export const setAuthSession = (session: BoxSession | null): void => {
  context.session = session;
};

export const setInitInfo = (initInfo: BoxInitInfo | null): void => {
  context.initInfo = initInfo;
};

export const setAuthFlow = (flow: CloudWebAuthFlow | null): void => {
  context.authFlow = flow;
};
