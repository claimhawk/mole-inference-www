import type { NextConfig } from "next";
import { execFileSync } from "child_process";

// Get git commit hash at build time
const getGitCommit = (): string => {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"]).toString().trim();
  } catch {
    return "unknown";
  }
};

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_COMMIT: getGitCommit(),
  },
};

export default nextConfig;
