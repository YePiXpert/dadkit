export const GROWTH_ILLUSTRATIONS = {
  8: "/growth/week-08-raspberry.webp",
  9: "/growth/week-09-cherry.webp",
  10: "/growth/week-10-strawberry.webp",
  11: "/growth/week-11-fig.webp",
  12: "/growth/week-12-plum.webp",
  13: "/growth/week-13-peach.webp",
  14: "/growth/week-14-lemon.webp",
  15: "/growth/week-15-apple.webp",
  16: "/growth/week-16-avocado.webp",
  17: "/growth/week-17-pear.webp",
  18: "/growth/week-18-bell-pepper.webp",
  19: "/growth/week-19-mango.webp",
  20: "/growth/week-20-banana.webp",
  21: "/growth/week-21-carrot.webp",
  22: "/growth/week-22-sweet-potato.webp",
  23: "/growth/week-23-tomato.webp",
  24: "/growth/week-24-corn.webp",
  25: "/growth/week-25-zucchini.webp",
  26: "/growth/week-26-scallion.webp",
  27: "/growth/week-27-cauliflower.webp",
  28: "/growth/week-28-eggplant.webp",
  29: "/growth/week-29-butternut-squash.webp",
  30: "/growth/week-30-cabbage.webp",
  31: "/growth/week-31-coconut.webp",
  32: "/growth/week-32-cantaloupe.webp",
  33: "/growth/week-33-broccoli.webp",
  34: "/growth/week-34-celery.webp",
  35: "/growth/week-35-pineapple.webp",
  36: "/growth/week-36-romaine.webp",
  37: "/growth/week-37-chard.webp",
  38: "/growth/week-38-green-onion.webp",
  39: "/growth/week-39-watermelon.webp",
  40: "/growth/week-40-pumpkin.webp",
} as const;

export function getGrowthIllustrationSrc(week: number) {
  const src =
    GROWTH_ILLUSTRATIONS[week as keyof typeof GROWTH_ILLUSTRATIONS];

  if (!src) {
    throw new Error(`没有为孕 ${week} 周配置成长插图。`);
  }

  return src;
}
