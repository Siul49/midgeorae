import { ALL_ITEMS } from "../data/items";
import type { ActionCardSnapshot, ServerItemCard } from "./types";

const CARDS_PER_PLAYER = 5;

const ITEM_IMAGE_BY_ID: Record<string, string> = {
  iphone: "/game-cards/cards/item-01-iphone.svg",
  airpods: "/game-cards/cards/item-02-airpods.svg",
  switch: "/game-cards/cards/item-03-switch.svg",
  bicycle: "/game-cards/cards/item-04-bicycle.svg",
  books: "/game-cards/cards/item-05-books.svg",
  sneakers: "/game-cards/cards/item-06-sneakers.svg",
  laptop: "/game-cards/cards/item-07-laptop.svg",
  camera: "/game-cards/cards/item-08-camera.svg",
  tablet: "/game-cards/cards/item-09-tablet.svg",
  keyboard: "/game-cards/cards/item-10-keyboard.svg",
  guitar: "/game-cards/cards/item-11-guitar.svg",
  bag: "/game-cards/cards/item-12-bag.svg",
  watch: "/game-cards/cards/item-13-watch.svg",
  figure: "/game-cards/cards/item-14-figure.svg",
  jacket: "/game-cards/cards/item-15-jacket.svg",
  speaker: "/game-cards/cards/item-16-speaker.svg",
};

export const ACTION_CARDS: ActionCardSnapshot[] = [
  {
    type: "tradeRequest",
    title: "구매 신청",
    description: "다른 플레이어의 물건 카드 1장에 구매 신청을 보냅니다.",
    imagePath: "/game-cards/actions/trade-request.svg",
  },
  {
    type: "freeGive",
    title: "무료나눔",
    description: "다른 플레이어의 물건 카드 1장에 0원 거래 신청을 보냅니다.",
    imagePath: "/game-cards/actions/free-give.svg",
  },
  {
    type: "directTrade",
    title: "직거래",
    description: "거래할 물건 카드를 먼저 공개하고 거래합니다.",
    imagePath: "/game-cards/actions/direct-trade.svg",
  },
  {
    type: "badReview",
    title: "악플테러",
    description: "지목한 플레이어의 좋아요 토큰 1개를 소멸시킵니다.",
    imagePath: "/game-cards/cards/event-11-e11.svg",
  },
  {
    type: "recycle",
    title: "분리수거",
    description: "벽돌 카드가 있다면 1장을 게임에서 제거합니다.",
    imagePath: "/game-cards/actions/recycle.svg",
  },
  {
    type: "swap",
    title: "물물교환",
    description: "지목한 플레이어와 물건 카드 1장을 무작위로 맞교환합니다.",
    imagePath: "/game-cards/cards/event-15-e15.svg",
  },
  {
    type: "saleRequest",
    title: "판매 신청",
    description: "내 물건 카드 1장의 가격을 정해 다른 플레이어에게 판매 신청을 보냅니다.",
    imagePath: "/game-cards/actions/direct-trade.svg",
  },
];

export function makeActionDeck() {
  return [
    ACTION_CARDS[0],
    ACTION_CARDS[0],
    ACTION_CARDS[0],
    ACTION_CARDS[6],
    ACTION_CARDS[6],
    ACTION_CARDS[6],
    ACTION_CARDS[1],
    ACTION_CARDS[1],
    ACTION_CARDS[2],
    ACTION_CARDS[2],
    ACTION_CARDS[3],
    ACTION_CARDS[3],
    ACTION_CARDS[4],
    ACTION_CARDS[5],
  ].map((card) => ({ ...card }));
}

export function makeItemDeck() {
  const normalCards = ALL_ITEMS.map((item) => ({
    id: item.id,
    name: item.name,
    marketPrice: item.marketPrice,
    category: item.category,
    condition: item.condition,
    acquiredPrice: null,
    isBrick: false,
    imagePath: ITEM_IMAGE_BY_ID[item.id] ?? "/game-cards/backs/item-back.svg",
  }));
  const bricks = Array.from({ length: 8 }, (_, index) => ({
    id: `brick-${index + 1}`,
    name: "벽돌",
    marketPrice: 0,
    category: null,
    condition: null,
    acquiredPrice: null,
    isBrick: true,
    imagePath: "/game-cards/actions/brick.svg",
  }));

  return [...bricks, ...normalCards];
}

export function dealItemHands(
  playerIds: string[],
  cardsPerPlayer = CARDS_PER_PLAYER,
): Record<string, ServerItemCard[]> {
  let deck = [...makeItemDeck()].sort(() => Math.random() - 0.5);
  let drawIndex = 0;
  const hands = Object.fromEntries(
    playerIds.map((playerId) => [playerId, [] as ServerItemCard[]]),
  );

  for (let round = 0; round < cardsPerPlayer; round += 1) {
    for (const ownerId of playerIds) {
      if (deck.length === 0) {
        deck = [...makeItemDeck()].sort(() => Math.random() - 0.5);
      }
      const card = deck.shift();
      if (!card) continue;
      hands[ownerId].push({
        ...card,
        instanceId: `${card.id}-${drawIndex}`,
        revealed: false,
        revealedToPlayerIds: [ownerId],
      });
      drawIndex += 1;
    }
  }

  return hands;
}
