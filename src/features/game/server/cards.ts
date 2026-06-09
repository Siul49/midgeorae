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
  // Fallback mappings for the remaining 10 items to prevent card back leaks
  sunglasses: "/game-cards/cards/item-13-watch.svg",
  wallet: "/game-cards/cards/item-12-bag.svg",
  boardgame_set: "/game-cards/cards/item-05-books.svg",
  camping_gear: "/game-cards/cards/item-04-bicycle.svg",
  coffee_machine: "/game-cards/cards/item-16-speaker.svg",
  air_purifier: "/game-cards/cards/item-16-speaker.svg",
  chair: "/game-cards/cards/item-14-figure.svg",
  desk_lamp: "/game-cards/cards/item-10-keyboard.svg",
  robot_vacuum: "/game-cards/cards/item-16-speaker.svg",
  toaster: "/game-cards/cards/item-16-speaker.svg",
};

export const ACTION_CARDS: ActionCardSnapshot[] = [
  {
    type: "tradeRequest",
    title: "살게요! 🙋",
    description: "다른 이웃의 물품 1장을 골라 살게요 제안을 보냅니다. (가격 조율 가능)",
    imagePath: "/game-cards/actions/trade-request.svg",
  },
  {
    type: "freeGive",
    title: "무료나눔 🎁",
    description: "내 손패의 물품 1장을 다른 이웃에게 0원(무료나눔)에 기분 좋게 선물해요. (거절 불가)",
    imagePath: "/game-cards/actions/free-give.svg",
  },
  {
    type: "directTrade",
    title: "만나서 직거래 🤝",
    description: "거래하고 싶은 물품을 상호 확실히 공개한 다음 정정당당하게 협상해요.",
    imagePath: "/game-cards/actions/direct-trade.svg",
  },
  {
    type: "badReview",
    title: "비매너 후기 👎",
    description: "비매너 유저를 신고하여 대상 플레이어의 평판 토큰 1개를 차감시킵니다.",
    imagePath: "/game-cards/cards/event-11-e11.svg",
  },
  {
    type: "recycle",
    title: "분리수거 ♻️",
    description: "내 손패에 필요 없는 벽돌이나 잡동사니 카드 1장을 폐기해 정리합니다.",
    imagePath: "/game-cards/actions/recycle.svg",
  },
  {
    type: "swap",
    title: "물물교환 🔄",
    description: "지목한 이웃의 손패 중 무작위 1장과 내 카드 1장을 재미로 맞교환해요.",
    imagePath: "/game-cards/cards/event-15-e15.svg",
  },
  {
    type: "saleRequest",
    title: "팔아요! 📢",
    description: "내 멋진 물품 1장을 선택하고 직접 가격을 책정해 이웃에게 제안해 봐요.",
    imagePath: "/game-cards/actions/direct-trade.svg",
  },
];

export function makeActionDeck() {
  return [
    ACTION_CARDS[0], // tradeRequest (50%)
    ACTION_CARDS[0],
    ACTION_CARDS[0],
    ACTION_CARDS[0],
    ACTION_CARDS[0],
    ACTION_CARDS[0],
    ACTION_CARDS[6], // saleRequest (8.3%)
    ACTION_CARDS[1], // freeGive (8.3%)
    ACTION_CARDS[2], // directTrade (8.3%)
    ACTION_CARDS[3], // badReview (8.3%)
    ACTION_CARDS[4], // recycle (8.3%)
    ACTION_CARDS[5], // swap (8.3%)
  ].map((card) => ({ ...card }));
}

export function makeItemDeck() {
  const conditions = ["mint", "used", "broken"] as const;
  const normalCards = ALL_ITEMS.map((item) => ({
    id: item.id,
    name: item.name,
    marketPrice: item.marketPrice,
    category: item.category,
    condition: conditions[Math.floor(Math.random() * conditions.length)],
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
  villainId?: string,
  cardsPerPlayer = CARDS_PER_PLAYER,
): Record<string, ServerItemCard[]> {
  const deckSource = makeItemDeck();
  const brickCards = deckSource.filter(card => card.isBrick).sort(() => Math.random() - 0.5);
  const normalCards = deckSource.filter(card => !card.isBrick).sort(() => Math.random() - 0.5);

  let drawIndex = 0;
  const hands = Object.fromEntries(
    playerIds.map((playerId) => [playerId, [] as ServerItemCard[]]),
  );

  for (const ownerId of playerIds) {
    const isVillain = villainId === ownerId;

    if (isVillain) {
      // 빌런: 벽돌 2개 분배
      for (let i = 0; i < 2; i++) {
        const card = brickCards.shift() || {
          id: `brick-${drawIndex}`,
          name: "벽돌",
          marketPrice: 0,
          category: null,
          condition: null,
          acquiredPrice: null,
          isBrick: true,
          imagePath: "/game-cards/actions/brick.svg",
        };
        hands[ownerId].push({
          ...card,
          instanceId: `${card.id}-${drawIndex}`,
          revealed: false,
          revealedToPlayerIds: [ownerId],
        });
        drawIndex += 1;
      }
      // 빌런: 일반 카드 3개 분배
      for (let i = 0; i < 3; i++) {
        const card = normalCards.shift();
        if (card) {
          hands[ownerId].push({
            ...card,
            instanceId: `${card.id}-${drawIndex}`,
            revealed: false,
            revealedToPlayerIds: [ownerId],
          });
          drawIndex += 1;
        }
      }
    } else {
      // 시민: 일반 카드 5개 분배
      for (let i = 0; i < 5; i++) {
        const card = normalCards.shift();
        if (card) {
          hands[ownerId].push({
            ...card,
            instanceId: `${card.id}-${drawIndex}`,
            revealed: false,
            revealedToPlayerIds: [ownerId],
          });
          drawIndex += 1;
        }
      }
    }
  }

  return hands;
}
