import type { GameState, GameAction, Player, TradeState, GameLog } from "../types";
import {
  PLAYER_COLORS,
  STARTING_MONEY,
  STARTING_MANNER_TEMP,
  MAX_ROUNDS,
  MANNER_LIKE_BONUS,
  MANNER_DISLIKE_PENALTY,
  MANNER_SELL_THRESHOLD,
  MANNER_BONUS_THRESHOLD,
  MANNER_BONUS_HIGH,
  MANNER_BONUS_MID,
  DISLIKE_SCORE_PENALTY,
} from "../types";
import { BOARD_SPACES, BOARD_SIZE } from "../data/board";
import { getRandomItems, getRandomItem, GOLDEN_ITEMS } from "../data/items";
import { drawEventCard } from "../data/events";
import { getRandomMission } from "../data/missions";

// ===== Initial State =====

export const initialGameState: GameState = {
  phase: "setup",
  players: [],
  currentPlayerIndex: 0,
  round: 1,
  maxRounds: MAX_ROUNDS,
  diceValue: null,
  currentTrade: null,
  currentEvent: null,
  freeGrabItem: null,
  freeGrabWinnerId: null,
  marketItems: getRandomItems(6),
  logs: [],
  votingResults: {},
  revealedVillain: null,
  winner: null,
  mannerVoteFrom: null,
  mannerVoteTo: null,
};

// ===== Helpers =====

function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function addLog(state: GameState, playerId: number, action: string, details: string): GameLog {
  return {
    turn: state.round,
    playerId,
    action,
    details,
    timestamp: Date.now(),
  };
}

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

function updatePlayer(state: GameState, playerId: number, updates: Partial<Player>): Player[] {
  return state.players.map((p) =>
    p.id === playerId ? { ...p, ...updates } : p
  );
}

function nextPlayerIndex(state: GameState): number {
  const next = (state.currentPlayerIndex + 1) % state.players.length;
  // check if next round
  return next;
}

function isNewRound(state: GameState): boolean {
  return (state.currentPlayerIndex + 1) >= state.players.length;
}

function calculateScore(player: Player): number {
  const itemsValue = player.items.reduce((sum, o) => sum + o.item.marketPrice, 0);
  const totalAssets = player.money + itemsValue;
  const dislikePenalty = player.dislikes * DISLIKE_SCORE_PENALTY;
  let mannerBonus = 0;
  if (player.mannerTemp >= MANNER_BONUS_THRESHOLD) {
    mannerBonus = MANNER_BONUS_HIGH;
  } else if (player.mannerTemp >= STARTING_MANNER_TEMP) {
    mannerBonus = MANNER_BONUS_MID;
  }
  return totalAssets + mannerBonus - dislikePenalty;
}

export { calculateScore };

// ===== Reducer =====

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      const playerCount = action.players.length;
      const villainIndex = Math.floor(Math.random() * playerCount);
      const players: Player[] = action.players.map((p, i) => ({
        id: i,
        name: p.name,
        role: i === villainIndex ? "villain" : "citizen",
        mission: i === villainIndex ? getRandomMission() : null,
        money: STARTING_MONEY,
        items: [],
        mannerTemp: STARTING_MANNER_TEMP,
        likes: 0,
        dislikes: 0,
        position: 0,
        color: PLAYER_COLORS[i],
        hasDiscount: false,
        skipNextTurn: false,
        extraTurn: false,
      }));

      return {
        ...initialGameState,
        phase: "turnStart",
        players,
        marketItems: getRandomItems(6),
        logs: [addLog(state, -1, "gameStart", `${playerCount}명으로 게임 시작!`)],
      };
    }

    case "CONFIRM_TURN": {
      const player = currentPlayer(state);
      if (player.skipNextTurn) {
        return {
          ...state,
          players: updatePlayer(state, player.id, { skipNextTurn: false }),
          phase: "turnEnd",
          logs: [...state.logs, addLog(state, player.id, "skipTurn", `${player.name}의 턴이 건너뛰어졌습니다`)],
        };
      }
      return { ...state, phase: "rolling" };
    }

    case "ROLL_DICE": {
      const dice = rollDice();
      const player = currentPlayer(state);
      const newPosition = (player.position + dice) % BOARD_SIZE;
      const passedStart = player.position + dice >= BOARD_SIZE;

      let newMoney = player.money;
      const newLogs = [...state.logs];

      if (passedStart && player.position !== 0) {
        newMoney += 100000;
        newLogs.push(addLog(state, player.id, "salary", `출발 지점을 지나며 월급 ${formatWon(100000)} 획득`));
      }

      return {
        ...state,
        diceValue: dice,
        phase: "moving",
        players: updatePlayer(state, player.id, {
          position: newPosition,
          money: newMoney,
        }),
        logs: newLogs,
      };
    }

    case "MOVE_COMPLETE": {
      const player = currentPlayer(state);
      const space = BOARD_SPACES[player.position];

      switch (space.type) {
        case "start":
          return { ...state, phase: "turnEnd" };
        case "buy":
        case "nego":
          return { ...state, phase: "action" };
        case "sell":
          if (player.items.length === 0 || player.mannerTemp < MANNER_SELL_THRESHOLD) {
            return {
              ...state,
              phase: "turnEnd",
              logs: [
                ...state.logs,
                addLog(
                  state,
                  player.id,
                  "cantSell",
                  player.items.length === 0
                    ? "판매할 물건이 없습니다"
                    : "매너 온도가 너무 낮아 아무도 사주지 않습니다!"
                ),
              ],
            };
          }
          return { ...state, phase: "action" };
        case "freebie":
          return {
            ...state,
            phase: "freeGrab",
            freeGrabItem: getRandomItem(),
            freeGrabWinnerId: null,
          };
        case "event":
          return {
            ...state,
            phase: "eventDraw",
            currentEvent: drawEventCard(),
          };
        case "manner":
          return {
            ...state,
            phase: "mannerVote",
            mannerVoteFrom: player.id,
            mannerVoteTo: null,
          };
        case "golden":
          return {
            ...state,
            phase: "action",
            marketItems: [...GOLDEN_ITEMS],
          };
        case "rest":
          return {
            ...state,
            phase: "turnEnd",
            players: updatePlayer(state, player.id, {
              mannerTemp: Math.min(42, player.mannerTemp + 0.3),
            }),
            logs: [
              ...state.logs,
              addLog(state, player.id, "rest", `카페에서 휴식. 매너 온도 +0.3°C`),
            ],
          };
        default:
          return { ...state, phase: "turnEnd" };
      }
    }

    case "BUY_ITEM": {
      const player = currentPlayer(state);
      const item = state.marketItems.find((i) => i.id === action.itemId);
      if (!item) return state;

      let price = item.marketPrice;
      const space = BOARD_SPACES[player.position];
      if (space.type === "nego") {
        price = Math.round(price * (0.7 + Math.random() * 0.6)); // ±30%
      }
      if (player.hasDiscount) {
        price = Math.round(price * 0.5);
      }

      if (player.money < price) return state;

      const isHardNego = price < item.marketPrice * 0.7;
      const isCheapBuy = price < item.marketPrice * 0.5;

      const newLogs = [
        ...state.logs,
        addLog(state, player.id, "buy", `${item.name}을(를) ${formatWon(price)}에 구매`),
      ];

      if (isHardNego) {
        newLogs.push(addLog(state, player.id, "hardNego", `하드 네고 성공! (${Math.round((1 - price / item.marketPrice) * 100)}% 할인)`));
      }
      if (isCheapBuy) {
        newLogs.push(addLog(state, player.id, "cheapBuy", `초저가 구매! (${formatWon(price)} / 원가 ${formatWon(item.marketPrice)})`));
      }

      const newMarket = state.marketItems.filter((i) => i.id !== item.id);
      if (newMarket.length < 3) {
        newMarket.push(...getRandomItems(3));
      }

      return {
        ...state,
        phase: "turnEnd",
        players: updatePlayer(state, player.id, {
          money: player.money - price,
          items: [...player.items, { item, purchasePrice: price }],
          hasDiscount: false,
        }),
        marketItems: newMarket,
        logs: newLogs,
      };
    }

    case "SKIP_BUY": {
      return {
        ...state,
        phase: "turnEnd",
        logs: [...state.logs, addLog(state, currentPlayer(state).id, "skipBuy", "구매를 건너뛰었습니다")],
      };
    }

    case "START_SELL": {
      const player = currentPlayer(state);
      const ownedItem = player.items[action.itemIndex];
      if (!ownedItem) return state;

      const trade: TradeState = {
        sellerId: player.id,
        buyerId: null,
        item: ownedItem,
        askingPrice: ownedItem.item.marketPrice,
        currentOffer: 0,
        phase: "listing",
        negoCount: 0,
      };

      return {
        ...state,
        phase: "trading",
        currentTrade: trade,
      };
    }

    case "JOIN_TRADE": {
      if (!state.currentTrade) return state;
      return {
        ...state,
        currentTrade: {
          ...state.currentTrade,
          buyerId: action.buyerId,
          phase: "negotiating",
        },
      };
    }

    case "MAKE_OFFER": {
      if (!state.currentTrade) return state;
      return {
        ...state,
        currentTrade: {
          ...state.currentTrade,
          currentOffer: action.price,
          negoCount: state.currentTrade.negoCount + 1,
        },
      };
    }

    case "ACCEPT_OFFER": {
      if (!state.currentTrade || state.currentTrade.buyerId === null) return state;
      const trade = state.currentTrade;
      const seller = state.players.find((p) => p.id === trade.sellerId)!;
      const buyer = state.players.find((p) => p.id === trade.buyerId)!;
      const finalPrice = trade.currentOffer || trade.askingPrice;

      if (buyer.money < finalPrice) return state;

      const isHardNego = finalPrice < trade.item.item.marketPrice * 0.7;
      const isCheapBuy = finalPrice < trade.item.item.marketPrice * 0.5;

      const newLogs = [
        ...state.logs,
        addLog(state, buyer.id, "trade", `${buyer.name}이(가) ${seller.name}에게서 ${trade.item.item.name}을(를) ${formatWon(finalPrice)}에 구매`),
      ];

      if (isHardNego) {
        newLogs.push(addLog(state, buyer.id, "hardNego", `하드 네고!`));
      }
      if (isCheapBuy) {
        newLogs.push(addLog(state, buyer.id, "cheapBuy", `초저가 구매!`));
      }

      const updatedPlayers = state.players.map((p) => {
        if (p.id === seller.id) {
          return {
            ...p,
            money: p.money + finalPrice,
            items: p.items.filter((item) => item !== trade.item),
          };
        }
        if (p.id === buyer.id) {
          return {
            ...p,
            money: p.money - finalPrice,
            items: [...p.items, { item: trade.item.item, purchasePrice: finalPrice }],
          };
        }
        return p;
      });

      return {
        ...state,
        players: updatedPlayers,
        currentTrade: { ...trade, phase: "completed" },
        phase: "mannerVote",
        mannerVoteFrom: buyer.id,
        mannerVoteTo: seller.id,
        logs: newLogs,
      };
    }

    case "REJECT_OFFER": {
      if (!state.currentTrade) return state;
      return {
        ...state,
        currentTrade: {
          ...state.currentTrade,
          currentOffer: 0,
          phase: "negotiating",
        },
      };
    }

    case "CANCEL_TRADE": {
      const player = currentPlayer(state);
      return {
        ...state,
        phase: "turnEnd",
        currentTrade: null,
        logs: [
          ...state.logs,
          addLog(state, player.id, "tradeCancelled", `거래가 파기되었습니다`),
        ],
      };
    }

    case "FREE_GRAB": {
      const item = state.freeGrabItem;
      if (!item || state.freeGrabWinnerId !== null) return state;

      return {
        ...state,
        freeGrabWinnerId: action.playerId,
        players: updatePlayer(state, action.playerId, {
          items: [
            ...state.players[action.playerId].items,
            { item, purchasePrice: 0 },
          ],
        }),
        phase: "turnEnd",
        logs: [
          ...state.logs,
          addLog(state, action.playerId, "freeGrab", `${state.players[action.playerId].name}이(가) ${item.name} 무료나눔 획득!`),
        ],
      };
    }

    case "RESOLVE_EVENT": {
      const event = state.currentEvent;
      if (!event) return { ...state, phase: "turnEnd" };

      const player = currentPlayer(state);
      let updatedPlayers = [...state.players];
      const newLogs = [...state.logs, addLog(state, player.id, "event", `이벤트: ${event.title}`)];

      switch (event.effect.type) {
        case "money": {
          updatedPlayers = updatePlayer(state, player.id, {
            money: Math.max(0, player.money + event.effect.amount),
          });
          break;
        }
        case "manner": {
          updatedPlayers = updatePlayer(state, player.id, {
            mannerTemp: Math.max(30, Math.min(42, player.mannerTemp + event.effect.amount)),
          });
          break;
        }
        case "loseItem": {
          if (player.items.length > 0) {
            const randomIdx = Math.floor(Math.random() * player.items.length);
            const lostItem = player.items[randomIdx];
            updatedPlayers = updatePlayer(state, player.id, {
              items: player.items.filter((_, i) => i !== randomIdx),
            });
            newLogs.push(addLog(state, player.id, "loseItem", `${lostItem.item.name}을(를) 잃었습니다`));
          }
          break;
        }
        case "gainLike": {
          updatedPlayers = updatePlayer(state, player.id, {
            likes: player.likes + event.effect.count,
            mannerTemp: player.mannerTemp + event.effect.count * MANNER_LIKE_BONUS,
          });
          break;
        }
        case "gainDislike": {
          updatedPlayers = updatePlayer(state, player.id, {
            dislikes: player.dislikes + event.effect.count,
            mannerTemp: player.mannerTemp - event.effect.count * MANNER_DISLIKE_PENALTY,
          });
          break;
        }
        case "discount": {
          updatedPlayers = updatePlayer(state, player.id, { hasDiscount: true });
          break;
        }
        case "skipTurn": {
          updatedPlayers = updatePlayer(state, player.id, { skipNextTurn: true });
          break;
        }
        case "extraTurn": {
          updatedPlayers = updatePlayer(state, player.id, { extraTurn: true });
          break;
        }
        case "stealItem": {
          const otherPlayers = state.players.filter((p) => p.id !== player.id && p.items.length > 0);
          if (otherPlayers.length > 0) {
            const victim = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
            const stolenIdx = Math.floor(Math.random() * victim.items.length);
            const stolenItem = victim.items[stolenIdx];
            updatedPlayers = state.players.map((p) => {
              if (p.id === victim.id) {
                return { ...p, items: p.items.filter((_, i) => i !== stolenIdx) };
              }
              if (p.id === player.id) {
                return { ...p, items: [...p.items, stolenItem] };
              }
              return p;
            });
            newLogs.push(addLog(state, player.id, "steal", `${victim.name}에게서 ${stolenItem.item.name}을(를) 훔쳤습니다!`));
          }
          break;
        }
        case "revealAssets":
        case "forceTrade":
        case "swapItems":
          // these are handled by UI - just proceed
          break;
      }

      return {
        ...state,
        phase: "turnEnd",
        players: updatedPlayers,
        currentEvent: null,
        logs: newLogs,
      };
    }

    case "VOTE_MANNER": {
      const targetId = action.targetId;
      const target = state.players.find((p) => p.id === targetId)!;

      let updatedPlayers: Player[];
      if (action.isLike) {
        updatedPlayers = updatePlayer(state, targetId, {
          likes: target.likes + 1,
          mannerTemp: target.mannerTemp + MANNER_LIKE_BONUS,
        });
      } else {
        updatedPlayers = updatePlayer(state, targetId, {
          dislikes: target.dislikes + 1,
          mannerTemp: target.mannerTemp - MANNER_DISLIKE_PENALTY,
        });
      }

      return {
        ...state,
        players: updatedPlayers,
        phase: "turnEnd",
        mannerVoteFrom: null,
        mannerVoteTo: null,
        currentTrade: null,
        logs: [
          ...state.logs,
          addLog(
            state,
            state.mannerVoteFrom ?? currentPlayer(state).id,
            action.isLike ? "like" : "dislike",
            `${target.name}에게 ${action.isLike ? "좋아요 👍" : "싫어요 👎"}`
          ),
        ],
      };
    }

    case "SKIP_MANNER_VOTE": {
      return {
        ...state,
        phase: "turnEnd",
        mannerVoteFrom: null,
        mannerVoteTo: null,
        currentTrade: null,
      };
    }

    case "END_TURN": {
      const player = currentPlayer(state);

      // Check for extra turn
      if (player.extraTurn) {
        return {
          ...state,
          phase: "turnStart",
          diceValue: null,
          players: updatePlayer(state, player.id, { extraTurn: false }),
        };
      }

      // Check game end
      const newRound = isNewRound(state) ? state.round + 1 : state.round;
      if (newRound > state.maxRounds) {
        return {
          ...state,
          phase: "voting",
          votingResults: Object.fromEntries(state.players.map((p) => [p.id, 0])),
        };
      }

      return {
        ...state,
        phase: "turnStart",
        currentPlayerIndex: nextPlayerIndex(state),
        round: newRound,
        diceValue: null,
        currentTrade: null,
        currentEvent: null,
        freeGrabItem: null,
        freeGrabWinnerId: null,
      };
    }

    case "VOTE_VILLAIN": {
      return {
        ...state,
        votingResults: {
          ...state.votingResults,
          [action.targetId]: (state.votingResults[action.targetId] || 0) + 1,
        },
      };
    }

    case "FINISH_VOTING": {
      const villain = state.players.find((p) => p.role === "villain")!;
      const mostVoted = Object.entries(state.votingResults).reduce((a, b) =>
        b[1] > a[1] ? b : a
      );
      const villainCaught = Number(mostVoted[0]) === villain.id;
      const missionComplete = villain.mission?.checkComplete(villain, state.logs) ?? false;

      // Calculate final scores
      const scores = state.players.map((p) => ({
        id: p.id,
        score: calculateScore(p),
      }));

      // Villain bonus/penalty
      let villainBonus = 0;
      if (missionComplete && !villainCaught) {
        villainBonus = 300000; // mission complete + not caught = big bonus
      } else if (missionComplete) {
        villainBonus = 100000; // mission complete but caught
      } else if (villainCaught) {
        villainBonus = -200000; // caught without completing mission
      }

      const adjustedScores = scores.map((s) => {
        if (s.id === villain.id) {
          return { ...s, score: s.score + villainBonus };
        }
        if (villainCaught) {
          return { ...s, score: s.score + 100000 }; // citizen bonus for catching villain
        }
        return s;
      });

      const citizenWinner = adjustedScores
        .filter((s) => s.id !== villain.id)
        .reduce((a, b) => (b.score > a.score ? b : a)).id;

      const winnerId = villainCaught ? citizenWinner : villain.id;

      return {
        ...state,
        phase: "gameOver",
        revealedVillain: villain.id,
        winner: winnerId,
      };
    }

    case "RESTART": {
      return { ...initialGameState };
    }

    default:
      return state;
  }
}
