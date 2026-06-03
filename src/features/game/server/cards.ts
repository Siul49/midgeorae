import { ALL_ITEMS } from "../data/items";
import type { ActionCardSnapshot, ServerItemCard } from "./types";

const CARDS_PER_PLAYER = 5;

export const ITEM_IMAGE_BY_ID: Record<string, string> = {
  iphone: "/game-cards/cards/item-01-iphone.png",
  airpods: "/game-cards/cards/item-02-airpods.png",
  switch: "/game-cards/cards/item-03-switch.png",
  bicycle: "/game-cards/cards/item-04-bicycle.png",
  books: "/game-cards/cards/item-05-books.png",
  sneakers: "/game-cards/cards/item-06-sneakers.png",
  laptop: "/game-cards/cards/item-07-laptop.png",
  camera: "/game-cards/cards/item-08-camera.png",
  tablet: "/game-cards/cards/item-09-tablet.png",
  keyboard: "/game-cards/cards/item-10-keyboard.png",
  guitar: "/game-cards/cards/item-11-guitar.png",
  bag: "/game-cards/cards/item-12-bag.png",
  watch: "/game-cards/cards/item-13-watch.png",
  figure: "/game-cards/cards/item-14-figure.png",
  jacket: "/game-cards/cards/item-15-jacket.png",
  speaker: "/game-cards/cards/item-16-speaker.png",
  sunglasses: "/game-cards/cards/item-17-sunglasses.png",
  wallet: "/game-cards/cards/item-18-wallet.png",
  boardgame_set: "/game-cards/cards/item-19-boardgame.png",
  camping_gear: "/game-cards/cards/item-20-camping.png",
  coffee_machine: "/game-cards/cards/item-21-coffee.png",
  air_purifier: "/game-cards/cards/item-22-airpurifier.png",
  chair: "/game-cards/cards/item-23-chair.png",
  desk_lamp: "/game-cards/cards/item-24-desklamp.png",
  robot_vacuum: "/game-cards/cards/item-25-robotvacuum.png",
  toaster: "/game-cards/cards/item-26-toaster.png",
  gold_ps5: "/game-cards/cards/gold-ps5.png",
  gold_macbook: "/game-cards/cards/gold-macbook.png",
  gold_rolex: "/game-cards/cards/gold-rolex.png",
};

export const ACTION_CARDS: ActionCardSnapshot[] = [
  {
    type: "tradeRequest",
    title: "거래 신청",
    description: "다른 플레이어의 물건 카드 1장에 구매 요청을 보냅니다.",
    imagePath: "/game-cards/actions/trade-request.png",
  },
  {
    type: "freeGive",
    title: "무료나눔",
    description: "다른 플레이어의 물건 카드 1장에 0원 거래 신청을 보냅니다.",
    imagePath: "/game-cards/actions/free-give.png",
  },
  {
    type: "directTrade",
    title: "직거래",
    description: "거래할 물건 카드를 먼저 공개하고 거래합니다.",
    imagePath: "/game-cards/actions/direct-trade.png",
  },
  {
    type: "badReview",
    title: "악플테러",
    description: "지목한 플레이어의 좋아요 토큰 1개를 소멸시킵니다.",
    imagePath: "/game-cards/cards/event-11-e11.png",
  },
  {
    type: "recycle",
    title: "분리수거",
    description: "벽돌 카드가 있다면 1장을 게임에서 제거합니다.",
    imagePath: "/game-cards/actions/recycle.png",
  },
  {
    type: "swap",
    title: "물물교환",
    description: "지목한 플레이어와 물건 카드 1장을 무작위로 맞교환합니다.",
    imagePath: "/game-cards/cards/event-15-e15.png",
  },
];

export function makeActionDeck() {
  return [
    ACTION_CARDS[0],
    ACTION_CARDS[0],
    ACTION_CARDS[0],
    ACTION_CARDS[0],
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
    originalPrice: item.originalPrice,
    marketPrice: item.marketPrice,
    category: item.category,
    condition: item.condition,
    customCondition: item.condition,
    askingPrice: item.originalPrice,
    isBrickDisguised: false,
    acquiredPrice: null,
    isBrick: false,
    imagePath: ITEM_IMAGE_BY_ID[item.id] ?? "/game-cards/backs/item-back.png",
  }));

  const bricks = Array.from({ length: 4 }, (_, index) => ({
    id: `brick-${index + 1}`,
    name: "벽돌",
    originalPrice: 0,
    marketPrice: 0,
    category: null,
    condition: "broken" as const,
    customCondition: "mint" as const,
    askingPrice: 500000,
    isBrickDisguised: false,
    acquiredPrice: null,
    isBrick: true,
    imagePath: "/game-cards/actions/brick.png",
  }));

  return [...bricks, ...normalCards];
}

export function dealItemHands(
  playerIds: string[],
  villainId: string | null,
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
      
      const isVillain = ownerId === villainId;
      let card = deck.shift();
      if (!isVillain) {
        // 시민은 벽돌을 가질 수 없으므로 벽돌 카드가 뽑히면 덱 맨 뒤로 돌림
        while (card && card.isBrick) {
          deck.push(card);
          card = deck.shift();
        }
      }
      
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

  // 빌런이 존재하는데 시작 손패에 벽돌이 한 장도 없는 경우 강제로 첫 번째 카드를 벽돌로 둔갑
  if (villainId && hands[villainId] && hands[villainId].length > 0) {
    const hasBrick = hands[villainId].some((c) => c.isBrick);
    if (!hasBrick) {
      hands[villainId][0] = {
        instanceId: `brick-0-${drawIndex}`,
        id: "brick",
        name: "벽돌 (위장 미설정)",
        category: null,
        condition: "broken",
        customCondition: "mint",
        askingPrice: 500000,
        isBrickDisguised: false,
        fakeItemId: undefined,
        originalPrice: 0,
        marketPrice: 0,
        acquiredPrice: null,
        isBrick: true,
        imagePath: "/game-cards/actions/brick.png",
        revealed: false,
        revealedToPlayerIds: [villainId],
      };
    }
  }

  return hands;
}
