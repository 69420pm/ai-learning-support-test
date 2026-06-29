/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: ["@ai-learning-support/core", "better-sqlite3"],
	webpack: (config, { isServer }) => {
		if (isServer) {
			if (Array.isArray(config.externals)) {
				config.externals.push("better-sqlite3");
			} else {
				config.externals = [config.externals, "better-sqlite3"].filter(Boolean);
			}
		}
		return config;
	},
};

export default nextConfig;
