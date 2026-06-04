import type { NextConfig } from "next";
import { buildAllowedDevOrigins } from "./src/features/game/server/network";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    ...buildAllowedDevOrigins(),
    "nonsubtile-shea-wretched.ngrok-free.dev",
    ...(process.env.ALLOWED_DEV_ORIGINS ? [process.env.ALLOWED_DEV_ORIGINS] : []),
  ],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
