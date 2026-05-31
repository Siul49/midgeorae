import { describe, expect, it } from "vitest";
import Home from "../page";
import { MidgeoraeOnlineGame } from "../../features/game/online/MidgeoraeOnlineGame";

describe("home page", () => {
  it("opens directly to the playable game screen", () => {
    const element = Home();

    expect(element.type).toBe(MidgeoraeOnlineGame);
  });
});
