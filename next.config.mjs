/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Security: TypeScript errors must be fixed before deployment
    // Set to true only temporarily during development if needed
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
