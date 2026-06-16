import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }, // Cho phép ảnh từ mọi domain (Google News images)
    ],
  },
};

export default nextConfig;
