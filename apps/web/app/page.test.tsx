import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Page from "./page";

vi.mock("@ai-learning-support/core", () => ({
	core: () => "mocked-core-greeting",
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));


describe("Page component", () => {
	it("should call core() and display its returned value", () => {
		const html = renderToStaticMarkup(<Page />);
		expect(html).toContain("mocked-core-greeting");
	});
});
