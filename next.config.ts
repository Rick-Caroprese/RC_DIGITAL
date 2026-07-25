import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El directorio del proyecto es la raíz (evita elegir un lockfile externo).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
