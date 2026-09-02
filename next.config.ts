import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://puxhylgbovybaedavjbw.supabase.co";
let supabaseHostname = "puxhylgbovybaedavjbw.supabase.co";
try {
  supabaseHostname = new URL(supabaseUrl).hostname;
} catch (e) {
  // Fallback to the exact hostname if parsing fails
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
      },
    ],
  },
};

export default nextConfig;
