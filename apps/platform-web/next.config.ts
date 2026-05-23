import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@workspace/ui", "@workspace/mocks"],
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
