/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly LAUNCHER_API_URL: string;
  readonly LAUNCHER_WEB_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}