// 陌生物品的参考实拍图（CC 授权，署名见 public/item-refs/CREDITS.md）。
// 图片为通用参考，与品牌无关；仅覆盖清单中容易买错的物品，宁缺毋滥。
// 增补流程：node scripts/fetch-item-refs.mjs candidates → 目检 contact sheet →
// 填 scripts/item-ref-picks.json → node scripts/fetch-item-refs.mjs finalize。

export interface ItemRefPhoto {
  src: string;
  alt: string;
}

export const ITEM_REF_PHOTOS: Record<string, ItemRefPhoto> = {
  "general-baby-changing-pads": {
    src: "/item-refs/general-baby-changing-pads.webp",
    alt: "隔尿垫的参考实拍图",
  },
  "general-going-home-blanket": {
    src: "/item-refs/general-going-home-blanket.webp",
    alt: "包被的参考实拍图",
  },
  "general-confinement-baby-pacifier": {
    src: "/item-refs/general-confinement-baby-pacifier.webp",
    alt: "安抚奶嘴的参考实拍图",
  },
  "general-going-home-car-seat": {
    src: "/item-refs/general-going-home-car-seat.webp",
    alt: "安全座椅的参考实拍图",
  },
  "general-confinement-mom-nursing-pillow": {
    src: "/item-refs/general-confinement-mom-nursing-pillow.webp",
    alt: "哺乳枕的参考实拍图",
  },
  "general-postpartum-pull-up-pants": {
    src: "/item-refs/general-postpartum-pull-up-pants.webp",
    alt: "产妇拉拉裤的参考实拍图",
  },
  "general-postpartum-breast-pads": {
    src: "/item-refs/general-postpartum-breast-pads.webp",
    alt: "防溢乳垫的参考实拍图",
  },
  "general-postpartum-milk-bags": {
    src: "/item-refs/general-postpartum-milk-bags.webp",
    alt: "储奶袋的参考实拍图",
  },
  "general-confinement-baby-bottle-warmer": {
    src: "/item-refs/general-confinement-baby-bottle-warmer.webp",
    alt: "温奶器的参考实拍图",
  },
};
