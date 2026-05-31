"use client";

import { useGame } from "../GameProvider";
import { GameSetup } from "./GameSetup";
import { TurnGuard } from "./TurnGuard";
import { DiceRoll } from "./DiceRoll";
import { GameBoard } from "./GameBoard";
import { BuyAction, SellAction } from "./BuyAction";
import { TradeDialog } from "./TradeDialog";
import { FreeGrab } from "./FreeGrab";
import { EventCardView } from "./EventCard";
import { MannerVote } from "./MannerVote";
import { VotePhase } from "./VotePhase";
import { GameOver } from "./GameOver";
import { BOARD_SPACES } from "../data/board";

export function GameController() {
  const { state } = useGame();

  switch (state.phase) {
    case "setup":
      return <GameSetup />;

    case "turnStart":
      return <TurnGuard />;

    case "rolling":
    case "moving":
      return <DiceRoll />;

    case "action": {
      const player = state.players[state.currentPlayerIndex];
      const space = BOARD_SPACES[player.position];
      if (space.type === "buy" || space.type === "nego" || space.type === "golden") {
        return <BuyAction />;
      }
      if (space.type === "sell") {
        return <SellAction />;
      }
      return <GameBoard />;
    }

    case "trading":
      return <TradeDialog />;

    case "freeGrab":
      return <FreeGrab />;

    case "eventDraw":
      return <EventCardView />;

    case "mannerVote":
      return <MannerVote />;

    case "turnEnd":
      return <GameBoard />;

    case "voting":
      return <VotePhase />;

    case "gameOver":
      return <GameOver />;

    default:
      return <GameSetup />;
  }
}
