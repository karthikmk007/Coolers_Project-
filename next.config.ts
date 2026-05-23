import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "aem.lcbo.com",
        pathname: "/content/dam/lcbo/**",
      },
    ],
  },
};

export default nextConfig;
