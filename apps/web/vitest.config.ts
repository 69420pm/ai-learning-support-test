import { defineConfig } from "vitest/config";

export default defineConfig({
	oxc: false,
	test: {
		name: "web",
		environment: "node",
	},
	esbuild: {
		jsx: "automatic",
	},
});
