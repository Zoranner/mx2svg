import { describe, expect, test } from "bun:test";
import { mxLabelToPlainText } from "./mx-label-plain.ts";

describe("mxLabelToPlainText", () => {
  test("strips block wrappers and keeps inner text", () => {
    expect(mxLabelToPlainText("<p>Hello</p>")).toBe("Hello");
    expect(mxLabelToPlainText('<div class="x">Hi</div>')).toBe("Hi");
    expect(mxLabelToPlainText("<font face=\"Arial\">X</font>")).toBe("X");
  });

  test("decodes entities before stripping tags", () => {
    expect(mxLabelToPlainText("&lt;p&gt;Inner&lt;/p&gt;")).toBe("Inner");
  });

  test("decodes double-encoded paragraph wrapper", () => {
    expect(mxLabelToPlainText("&amp;lt;p&amp;gt;Inner&amp;lt;/p&amp;gt;")).toBe("Inner");
  });

  test("line breaks and tags collapse to single-line spaces", () => {
    expect(mxLabelToPlainText("A<br/>B")).toBe("A B");
    expect(mxLabelToPlainText("A\n\nB")).toBe("A B");
  });

  test("removes HTML comments", () => {
    expect(mxLabelToPlainText("a<!--c-->b")).toBe("ab");
  });
});
