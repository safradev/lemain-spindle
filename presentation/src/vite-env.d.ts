/// <reference types="vite/client" />

import type { SpindleApi } from "./types/spindle";

declare global {
  interface Window {
    spindle: SpindleApi;
  }
}

declare module "*.css";

export {};
