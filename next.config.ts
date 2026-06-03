import type { NextConfig } from "next";
import { buildAllowedDevOrigins } from "./src/features/game/server/network";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    ...buildAllowedDevOrigins(),
    "nonsubtile-shea-wretched.ngrok-free.dev"
  ],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
