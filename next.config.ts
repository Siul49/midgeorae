import type { NextConfig } from "next";
import { buildAllowedDevOrigins } from "./src/features/game/server/network";

const nextConfig: NextConfig = {
  allowedDevOrigins: buildAllowedDevOrigins(),
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
