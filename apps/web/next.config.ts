import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E builds into its own folder so it can run next to a developer's `next dev` (one dev server per folder).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
