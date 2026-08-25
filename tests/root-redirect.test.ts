import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("EssayFlow homepage", () => {
  const source = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");

  it("links the primary evaluation button to the live evaluation page", () => {
    expect(source).toContain("测试我的续写");
    expect(source).toContain('window.location.href = "/essayflow-evaluate.html"');
    expect(source).not.toContain('redirect("/essayflow-visual-prototype-v2.html")');
  });
});
