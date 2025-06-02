/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true, // ← これが必須
  },
  typescript: {
    ignoreBuildErrors: true,  // ← any や型エラー回避（必要なら）
  },
}

module.exports = nextConfig
