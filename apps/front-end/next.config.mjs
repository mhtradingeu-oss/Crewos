import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Ensure shared package resolves to built artifacts for Next/SWC.
    config.resolve.alias["@mh-os/shared"] = path.resolve(__dirname, "../../packages/shared/dist");
    return config;
  },
};

export default nextConfig;
