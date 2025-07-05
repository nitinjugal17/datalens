
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    // This is to fix build issues with Genkit's dependencies.
    // @opentelemetry/exporter-jaeger is an optional dependency that we don't use.
    config.resolve.alias['@opentelemetry/exporter-jaeger'] = false;
    return config;
  },
  serverExternalPackages: ['handlebars'],
};

export default nextConfig;
