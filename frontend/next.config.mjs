/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Disable caching if it's causing issues
    config.cache = false;
    
    return config;
  }
};

export default nextConfig;
