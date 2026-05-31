import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("card table visual theme", () => {
  it("defines the B1 card-table surfaces and motion hooks", () => {
    expect(css).toContain(".market-card-table");
    expect(css).toContain(".market-card-lane");
    expect(css).toContain(".market-board-grid");
    expect(css).toContain(".game-frame-shell");
    expect(css).toContain(".game-table-layout");
    expect(css).toContain(".game-top-strip");
    expect(css).toContain(".table-card");
    expect(css).toContain(".table-chip");
    expect(css).toContain(".game-deck-rail");
    expect(css).toContain(".deal-note");
    expect(css).toContain(".hand-card-grid");
    expect(css).toContain(".deal-card-lift");
    expect(css).toContain("@keyframes deal-card-lift");
    expect(css).toContain("@keyframes card-table-enter");
  });

  it("fits the game frame to the viewport and has a phone cockpit layout", () => {
    expect(css).toContain(".game-screen-viewport");
    expect(css).toContain("height: 100dvh");
    expect(css).toContain("width: 100vw");
    expect(css).toContain("min-width: min(1240px, 100%)");
    expect(css).toContain("grid-template-areas");
    expect(css).toContain("\"actions\"");
    expect(css).toContain("\"board\"");
    expect(css).toContain("\"social\"");
    expect(css).not.toContain("min-width: 1240px;");
  });
});
