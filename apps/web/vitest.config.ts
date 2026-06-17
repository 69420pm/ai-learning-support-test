import { defineConfig } from "vitest/config";

export default defineConfig({
	oxc: false,
	test: {
		environment: "node",
	},
	esbuild: {
		jsx: "automatic",
	},
});
