import { describe, it, expect, beforeEach } from "vitest";

describe("main UI bootstrap", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    sessionStorage.clear();
  });

  it("renders the masthead, gate, and disclaimer without throwing", async () => {
    await import("./main");
    const app = document.querySelector("#app")!;
    expect(app.querySelector(".masthead h1")?.textContent).toMatch(/Correlation Engine/);
    expect(app.querySelector(".banner")?.textContent).toMatch(/deliberately fallacious/i);
    // The subject picklist is the safety gate: a non-empty dropdown, no text input.
    const select = app.querySelector<HTMLSelectElement>("#subject")!;
    expect(select.options.length).toBeGreaterThanOrEqual(10);
    // Provider defaults are pre-filled.
    expect(app.querySelector<HTMLInputElement>("#baseUrl")!.value).toContain("openrouter");
  });
});
