import { describe, expect, it, vi } from "vitest";
import Page from "./page";

vi.mock("@ai-learning-support/core", () => ({
	core: () => "mocked-core-greeting",
}));

describe("Page component", () => {
	it("should call core() and display its returned value", () => {
		const element = Page();
		expect(element).toBeDefined();
		const stringified = JSON.stringify(element);
		expect(stringified).toContain("mocked-core-greeting");
	});
});
