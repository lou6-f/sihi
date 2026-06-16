import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bật standalone output để Docker image gọn hơn (~3x nhỏ hơn)
  output: "standalone",
};

export default nextConfig;
