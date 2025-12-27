import { loadEnv, type RuntimeEnv } from "./env.runtime.js";

// For test compatibility: allow CJS require in Jest (ts-jest ESM interop)
// No business logic change
// eslint-disable-next-line @typescript-eslint/no-var-requires
if (typeof module !== "undefined" && module.exports) {
  module.exports.loadEnv = loadEnv;
}

export type Env = RuntimeEnv;
export { loadEnv };

export const env: Env = loadEnv();
export const isProdLikeEnv = env.NODE_ENV === "production" || env.NODE_ENV === "staging";
