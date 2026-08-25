/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // Serve the confirmed editorial homepage at the canonical root URL.
        { source: "/", destination: "/index.html" },
      ],
    };
  },
};

export default nextConfig;
