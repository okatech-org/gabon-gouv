import type { NextConfig } from "next"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@workspace/ui"],
  // Build standalone (serveur Node minimal) pour une image Docker Cloud Run légère.
  output: "standalone",
  // Le tracing des fichiers doit partir de la racine du monorepo pour inclure
  // les packages workspace (@workspace/ui, @workspace/backend) et bun.lock.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
