import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ExcelJS is Node-only and large; keep it out of the server bundle.
  serverExternalPackages: ["exceljs"],
  experimental: {
    // CSV imports send up to a few thousand parsed rows to a Server Action.
    serverActions: { bodySizeLimit: "4mb" },
    // Keep visited pages in the client cache briefly so moving between tabs is
    // instant; Server Actions and live updates still refresh them.
    staleTimes: { dynamic: 60, static: 300 },
  },
};

export default nextConfig;
