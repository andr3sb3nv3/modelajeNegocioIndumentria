import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  // Los reportes y vistas de análisis ficticios se incluyen también en el despliegue.
  outputFileTracingIncludes: {
    "/": ["./data/reportes/**/*"],
    "/ia": ["./data/ia/**/*", "./public/ia/**/*"],
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "same-origin" },
    ] }];
  },
};
export default config;
