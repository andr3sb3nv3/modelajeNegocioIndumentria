import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import handler from "./api/dashboard.js";

function dashboardApi(): Plugin {
  const middleware = (server: {
    middlewares: { use: (route: string, fn: typeof handler) => void };
  }) => {
    server.middlewares.use("/api/dashboard", handler);
  };
  return {
    name: "demo-dashboard-api",
    configureServer: middleware,
    configurePreviewServer: middleware,
  };
}

export default defineConfig({ plugins: [react(), dashboardApi()] });
