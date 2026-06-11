import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
   allowedDevOrigins: ['dentate-pablo-counterattractively.ngrok-free.dev']
};

export default nextConfig;
