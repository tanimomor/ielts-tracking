import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ExcelJS is Node-only and large; keep it out of the server bundle.
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
