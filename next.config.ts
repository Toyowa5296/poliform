/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // eslint: { // これらの行をコメントアウトするか削除します
  //   ignoreDuringBuilds: true,
  // },
  // typescript: { // これらの行をコメントアウトするか削除します
  //   ignoreBuildErrors: true, // ←型エラーも無視したいなら
  // },
}

module.exports = nextConfig