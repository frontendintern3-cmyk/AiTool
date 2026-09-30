import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lighthouse, chrome-launcher, and Playwright rely on dynamic `require`/`import`
  // and native binaries that Turbopack/webpack can't statically bundle. Running
  // them as plain externals (resolved from node_modules at runtime, like a normal
  // Node.js script) is the standard fix rather than trying to bundle them.
  serverExternalPackages: ["lighthouse", "chrome-launcher", "playwright", "playwright-core", "@axe-core/playwright"],
};

export default nextConfig;
