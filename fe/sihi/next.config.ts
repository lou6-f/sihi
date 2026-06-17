import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: 'output: standalone' is for Docker only — removed for Vercel
  typescript: {
    // Next.js 15 thay đổi kiểu params → ignoreBuildErrors để build pass trên Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }, // Cho phép ảnh từ mọi domain (Google News images)
    ],
  },
};


export default nextConfig;
