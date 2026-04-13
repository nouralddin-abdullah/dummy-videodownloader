import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.9"],
  // Include the bundled yt-dlp binary in serverless function bundles.
  outputFileTracingIncludes: {
    "/api/media/*": ["./bin/**"],
  },
};

export default nextConfig;
