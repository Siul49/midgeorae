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
    type: "donation",
    title: "기부천사 😇",
    description: "이웃 중 1명을 지목해 그들의 손패 중 무작위 물품 1장을 일방적으로 기부(강탈)받아 옵니다.",
    imagePath: "/game-cards/actions/donation.svg",
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
  {
    type: "repair",
    title: "자가 수리 🛠️",
    description: "내 손패의 물건 중 원하는 카드 1장을 '미개봉' 상태로 업그레이드합니다.",
    imagePath: "/game-cards/actions/repair.svg",
  },
];

export function makeActionDeck() {
  return [
    ACTION_CARDS[0], // tradeRequest
    ACTION_CARDS[0],
    ACTION_CARDS[0],
    ACTION_CARDS[0],
    ACTION_CARDS[0],
    ACTION_CARDS[6], // saleRequest
    ACTION_CARDS[1], // freeGive
    ACTION_CARDS[2], // directTrade
    ACTION_CARDS[3], // badReview
    ACTION_CARDS[4], // donation
    ACTION_CARDS[5], // swap
    ACTION_CARDS[7], // repair
  ].map((card) => ({ ...card }));
}

export function makeItemDeck() {
  const conditions = ["unopened", "mint", "used", "broken"] as const;
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
  const conditions = ["unopened", "mint", "used", "broken"] as const;

  // 1. Shuffle ALL_ITEMS to select unique items for normal cards + brick disguises
  const shuffledItems = [...ALL_ITEMS].sort(() => Math.random() - 0.5);

  // How many normal cards do we need?
  // Villain gets 3 normal cards + 2 bricks.
  // Other players get cardsPerPlayer (5) normal cards.
  const numBricks = 2;
  const numNormal = playerIds.length * cardsPerPlayer - numBricks;
  const totalUniqueNeeded = numNormal + numBricks; // which is exactly playerIds.length * cardsPerPlayer

  // Select unique items. If we need more than we have (e.g. 5 players = 25 items, but we only have 24 in ALL_ITEMS), repeat items safely
  const selectedItems: typeof ALL_ITEMS = [];
  for (let i = 0; i < totalUniqueNeeded; i++) {
    selectedItems.push(shuffledItems[i % shuffledItems.length]);
  }

  // Divide into normal items and brick disguise items
  const normalItemPool = selectedItems.slice(0, numNormal);
  const brickDisguisePool = selectedItems.slice(numNormal);

  // 2. Create the normal cards
  let drawIndex = 0;
  const normalCards: ServerItemCard[] = normalItemPool.map((item) => ({
    instanceId: `${item.id}-${drawIndex++}`,
    id: item.id,
    name: item.name,
    marketPrice: item.marketPrice,
    category: item.category,
    condition: conditions[Math.floor(Math.random() * conditions.length)],
    acquiredPrice: null,
    isBrick: false,
    imagePath: ITEM_IMAGE_BY_ID[item.id] ?? "/game-cards/backs/item-back.svg",
    revealed: false,
    revealedToPlayerIds: [],
  }));

  // 3. Create the brick cards with their unique disguise attached
  const brickCards: ServerItemCard[] = brickDisguisePool.map((fakeItem) => {
    const fakeCond = conditions[Math.floor(Math.random() * conditions.length)];
    const brickInstanceId = `brick-${drawIndex++}`;
    return {
      instanceId: brickInstanceId,
      id: brickInstanceId,
      name: "벽돌",
      marketPrice: 0,
      category: null,
      condition: null,
      acquiredPrice: null,
      isBrick: true,
      imagePath: "/game-cards/actions/brick.svg",
      revealed: false,
      revealedToPlayerIds: [],
      // Storing disguise info directly on the card!
      disguiseId: fakeItem.id,
      disguiseName: fakeItem.name,
      disguiseCategory: fakeItem.category,
      disguiseCondition: fakeCond,
      disguiseMarketPrice: fakeItem.marketPrice,
      disguiseImagePath: ITEM_IMAGE_BY_ID[fakeItem.id] ?? "/game-cards/backs/item-back.svg",
    };
  });

  // 4. Distribute to hands
  const hands = Object.fromEntries(
    playerIds.map((playerId) => [playerId, [] as ServerItemCard[]]),
  );

  let normalDrawIndex = 0;
  let brickDrawIndex = 0;

  for (const ownerId of playerIds) {
    const isVillain = villainId === ownerId;

    if (isVillain) {
      // Villain: 2 brick cards
      for (let i = 0; i < 2; i++) {
        const brickCard = brickCards[brickDrawIndex++];
        if (brickCard) {
          hands[ownerId].push({
            ...brickCard,
            revealedToPlayerIds: [ownerId],
          });
        }
      }
      // Villain: 3 normal cards
      for (let i = 0; i < 3; i++) {
        const normalCard = normalCards[normalDrawIndex++];
        if (normalCard) {
          hands[ownerId].push({
            ...normalCard,
            revealedToPlayerIds: [ownerId],
          });
        }
      }
    } else {
      // Citizen: 5 normal cards
      for (let i = 0; i < cardsPerPlayer; i++) {
        const normalCard = normalCards[normalDrawIndex++];
        if (normalCard) {
          hands[ownerId].push({
            ...normalCard,
            revealedToPlayerIds: [ownerId],
          });
        }
      }
    }
  }

  return hands;
}
