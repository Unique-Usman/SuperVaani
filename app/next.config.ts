/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	typescript: {
		// This will ignore ALL TypeScript errors during build
		ignoreBuildErrors: true,
	},
	images: {
		domains: ["graph.microsoft.com", "localhost"],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**.microsoft.com",
				pathname: "**",
			},
		],
	},
};

module.exports = nextConfig;
