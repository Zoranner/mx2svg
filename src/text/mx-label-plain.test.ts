import { describe, expect, test } from "bun:test";
import { mxLabelHtmlFontSizePx, mxLabelToPlainText } from "./mx-label-plain.ts";

describe("mxLabelToPlainText", () => {
  test("strips block wrappers and keeps inner text", () => {
    expect(mxLabelToPlainText("<p>Hello</p>")).toBe("Hello");
    expect(mxLabelToPlainText('<div class="x">Hi</div>')).toBe("Hi");
    expect(mxLabelToPlainText('<font face="Arial">X</font>')).toBe("X");
  });

  test("decodes entities before stripping tags", () => {
    expect(mxLabelToPlainText("&lt;p&gt;Inner&lt;/p&gt;")).toBe("Inner");
  });

  test("decodes double-encoded paragraph wrapper", () => {
    expect(mxLabelToPlainText("&amp;lt;p&amp;gt;Inner&amp;lt;/p&amp;gt;")).toBe("Inner");
  });

  test("line breaks from br and blank lines become newline-separated lines", () => {
    expect(mxLabelToPlainText("A<br/>B")).toBe("A\nB");
    expect(mxLabelToPlainText("A\n\nB")).toBe("A\nB");
  });

  test("multiple block elements become multiple lines", () => {
    expect(mxLabelToPlainText("<p>One</p><p>Two</p>")).toBe("One\nTwo");
    expect(mxLabelToPlainText("<div>a</div><div>b</div>")).toBe("a\nb");
  });

  test("removes HTML comments", () => {
    expect(mxLabelToPlainText("a<!--c-->b")).toBe("ab");
  });
});

describe("mxLabelHtmlFontSizePx", () => {
  test("reads font-size from style attribute", () => {
    expect(mxLabelHtmlFontSizePx('<font style="font-size: 17px;">x</font>')).toBe(17);
  });

  test("returns largest px when nested", () => {
    expect(
      mxLabelHtmlFontSizePx(
        '<span style="font-size: 12px;"><font style="font-size: 20px;">a</font></span>',
      ),
    ).toBe(20);
  });
});
