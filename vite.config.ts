import { defineConfig } from "vite";

// Local-only proxy keeps cookies and CSRF on the browser's own origin. The API
// target is fixed to loopback; no browser-controlled upstream or public tunnel.
export default defineConfig({
  server: {
    host: "127.0.0.1",
    proxy: {
      "/v1": "http://127.0.0.1:3001",
      "/health": "http://127.0.0.1:3001",
    },
  },
});
