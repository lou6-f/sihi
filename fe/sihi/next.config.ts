import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: 'output: standalone' is for Docker only — removed for Vercel
  turbopack: undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }, // Cho phép ảnh từ mọi domain (Google News images)
    ],
  },
};

export default nextConfig;
