/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Ignorar erros de TypeScript no build
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignorar erros de ESLint no build
  },
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: './empty-module.ts',
      },
    },
  },
}

module.exports = nextConfig
