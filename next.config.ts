import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ExcelJS is Node-only and large; keep it out of the server bundle.
  serverExternalPackages: ["exceljs"],
  experimental: {
    // CSV imports send up to a few thousand parsed rows to a Server Action.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
