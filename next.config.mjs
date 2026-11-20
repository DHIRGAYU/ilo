import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSecurityHeaders } from "./lib/security/headers.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const ortWasm = path.join(root, "node_modules/onnxruntime-web/dist/ort.wasm.min.mjs");
const ortWebgpu = path.join(root, "node_modules/onnxruntime-web/dist/ort.webgpu.min.mjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { agentUpgrade: "security" },
  allowedDevOrigins: ["127.0.0.1", "192.168.1.15", "172.20.65.193", "192.168.1.4", "192.168.10.44", "arab-santa-recommended-pastor.trycloudflare.com"],
  // The wasm build fetches its runtime from /ort instead of bundling a second copy.
  turbopack: {
    resolveAlias: {
      "onnxruntime-web/wasm": "./node_modules/onnxruntime-web/dist/ort.wasm.min.mjs",
      "onnxruntime-web/webgpu": "./node_modules/onnxruntime-web/dist/ort.webgpu.min.mjs",
    },
  },
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, "onnxruntime-web/wasm": ortWasm, "onnxruntime-web/webgpu": ortWebgpu };
    return config;
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: buildSecurityHeaders({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        production: process.env.NODE_ENV === "production",
        dailyDomain: process.env.DAILY_DOMAIN,
      }),
    }];
  },
};
export default nextConfig;
