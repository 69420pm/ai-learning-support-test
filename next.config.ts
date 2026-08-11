import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.215.2', '127.0.0.1:3000', 'localhost:3000'],
};

export default nextConfig;
