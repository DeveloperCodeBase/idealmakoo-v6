import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // The installed TypeScript 5 compiler API keeps full build-time checking
  // independent of detached CLI stdout capture in managed build environments.
  experimental: { cpus: 2, useTypeScriptCli: false, optimizePackageImports: ['lucide-react'] },
};
export default nextConfig;
