import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: { root: path.join(__dirname) },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "wludvazctcooytzjjjxi.supabase.co" },
    ],
  },
  async redirects() {
    return [
      // Short entry point used in shared links; onboarding lives under /onboarding.
      { source: "/signup", destination: "/onboarding/signup", permanent: false },
    ];
  },
};

export default nextConfig;
