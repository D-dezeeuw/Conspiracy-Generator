import { describe, it, expect } from "vitest";
import { escapeHtml, paragraphsToHtml } from "./format";

describe("escapeHtml", () => {
  it("escapes the dangerous characters", () => {
    expect(escapeHtml(`<script>"&'`)).toBe("&lt;script&gt;&quot;&amp;&#39;");
  });
  it("leaves plain text intact", () => {
    expect(escapeHtml("Nikola Tesla")).toBe("Nikola Tesla");
  });
});

describe("paragraphsToHtml", () => {
  it("splits on blank lines into escaped paragraphs", () => {
    expect(paragraphsToHtml("one\n\ntwo")).toBe("<p>one</p><p>two</p>");
  });
  it("escapes HTML inside paragraphs", () => {
    expect(paragraphsToHtml("<b>hi</b>")).toBe("<p>&lt;b&gt;hi&lt;/b&gt;</p>");
  });
  it("converts single newlines to <br>", () => {
    expect(paragraphsToHtml("a\nb")).toBe("<p>a<br>b</p>");
  });
  it("drops empty paragraphs", () => {
    expect(paragraphsToHtml("\n\n\n")).toBe("");
  });
});
