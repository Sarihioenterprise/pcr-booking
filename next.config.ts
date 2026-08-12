import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Vanity/typo-friendly auth URLs. People type these from emails, ads,
      // and business cards — every one of them used to 404.
      { source: "/signup", destination: "/auth/signup", permanent: true },
      { source: "/sign-up", destination: "/auth/signup", permanent: true },
      { source: "/register", destination: "/auth/signup", permanent: true },
      { source: "/get-started", destination: "/auth/signup", permanent: true },
      { source: "/start", destination: "/auth/signup", permanent: true },
      { source: "/join", destination: "/auth/signup", permanent: true },
      { source: "/trial", destination: "/auth/signup", permanent: true },
      { source: "/login", destination: "/auth/login", permanent: true },
      { source: "/log-in", destination: "/auth/login", permanent: true },
      { source: "/signin", destination: "/auth/login", permanent: true },
      { source: "/sign-in", destination: "/auth/login", permanent: true },

      // Marketing shortcuts
      { source: "/demo", destination: "/tour", permanent: true },
      { source: "/plans", destination: "/pricing", permanent: true },

      // Bare booking paths have no operator slug, so send them somewhere useful
      // instead of 404ing. /book/:slug and /rent/:slug still resolve normally.
      { source: "/book", destination: "/", permanent: false },
      { source: "/booking", destination: "/", permanent: false },
      { source: "/reserve", destination: "/", permanent: false },
      { source: "/rent", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
