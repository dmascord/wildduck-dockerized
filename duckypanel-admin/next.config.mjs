const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath,
  reactStrictMode: true,
  experimental: {
    typedRoutes: false
  }
}

export default nextConfig
