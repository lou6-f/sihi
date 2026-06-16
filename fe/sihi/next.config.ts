import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Dùng webpack thay Turbopack (Turbopack 16.x bị lỗi crash liên tục)
  turbopack: undefined,
};

export default nextConfig;
