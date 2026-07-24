import type { SVGProps } from "react";

import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ChecklistGlyphKey =
  | "bag"
  | "bottle"
  | "car"
  | "care"
  | "clothes"
  | "diaper"
  | "document"
  | "electronics"
  | "food"
  | "home"
  | "hygiene"
  | "package"
  | "sleep";

export function getChecklistGlyphKey(
  item: Pick<ChecklistItem, "category" | "name" | "bag">,
): ChecklistGlyphKey {
  const name = item.name.replace(/\s+/g, "");

  if (/(身份证|证件|医保|社保|户口|结婚证|资料|病历|银行卡|现金|票据)/.test(name)) {
    return "document";
  }
  if (/(纸尿裤|尿不湿|隔尿|尿垫)/.test(name)) return "diaper";
  if (/(奶瓶|奶粉|喂养|硅胶勺|吸奶器|储奶)/.test(name)) return "bottle";
  if (/(手机|充电|相机|耳机|插线|电源)/.test(name)) return "electronics";
  if (/(安全座椅|车辆|停车|接送)/.test(name) || item.bag === "car") return "car";
  if (/(药|膏|冷敷|创可贴|消毒|护理|退热|体温)/.test(name)) return "care";
  if (/(衣|裤|袜|鞋|帽|文胸|拖鞋|睡衣)/.test(name)) return "clothes";
  if (/(包被|被子|睡袋|床单|枕|毯)/.test(name)) return "sleep";
  if (/(洗|湿巾|棉柔巾|纸巾|毛巾|牙|漱口|梳|清洁|肥皂|脸盆)/.test(name)) {
    return "hygiene";
  }
  if (/(水|杯|零食|巧克力|餐|饭|食品|吸管)/.test(name)) return "food";
  if (/(收纳|行李|背包|待产包|证件袋)/.test(name)) return "bag";
  if (item.category === "going_home") return "home";
  if (item.category === "documents") return "document";
  if (item.category === "baby") return "bottle";
  if (item.category === "mom_labor" || item.category === "mom_postpartum") {
    return "care";
  }

  return "package";
}

export function ChecklistItemGlyph({
  className,
  item,
}: {
  className?: string;
  item: Pick<ChecklistItem, "category" | "name" | "bag">;
}) {
  const common: SVGProps<SVGSVGElement> = {
    "aria-hidden": true,
    className: cn("size-6", className),
    fill: "none",
    focusable: "false",
    viewBox: "0 0 32 32",
  };

  switch (getChecklistGlyphKey(item)) {
    case "document":
      return (
        <svg {...common}>
          <path d="M8 4.5h11l5 5V27H8z" fill="#F7FBFF" stroke="#6B8FB8" strokeWidth="1.6" />
          <path d="M19 4.5v5h5" fill="#B8D9F5" stroke="#6B8FB8" strokeLinejoin="round" strokeWidth="1.6" />
          <path d="m11.5 18 2.7 2.7 6-6.4" stroke="#F36B86" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
          <path d="M11.5 12.5h5" stroke="#F6B84B" strokeLinecap="round" strokeWidth="2" />
        </svg>
      );
    case "clothes":
      return (
        <svg {...common}>
          <path d="m10 7 3.4-1.8c.7 2 4.5 2 5.2 0L22 7l5 5-3.7 3.5-2-1.7V27H10.7V13.8l-2 1.7L5 12z" fill="#FF91A8" stroke="#B84F6A" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M13.4 5.2c.5 2.5 4.7 2.5 5.2 0" stroke="#FFE19A" strokeLinecap="round" strokeWidth="2" />
          <path d="M13 19h6" stroke="#FFF8F1" strokeLinecap="round" strokeWidth="2" />
        </svg>
      );
    case "diaper":
      return (
        <svg {...common}>
          <path d="M6 8.5h20l-2.2 15c-4.8 4.2-10.8 4.2-15.6 0z" fill="#FFFDF8" stroke="#62A58F" strokeLinejoin="round" strokeWidth="1.6" />
          <path d="M6.8 10.5h6l-1.3 5-3.7-1.6zm18.4 0h-6l1.3 5 3.7-1.6z" fill="#79D8B7" />
          <path d="M12 22c2.5-2 5.5-2 8 0" stroke="#F6BD55" strokeLinecap="round" strokeWidth="2" />
        </svg>
      );
    case "bottle":
      return (
        <svg {...common}>
          <path d="M12 4.5h8v4l2.5 3V26c0 1.1-.9 2-2 2h-9a2 2 0 0 1-2-2V11.5l2.5-3z" fill="#E8FAF5" stroke="#509B89" strokeLinejoin="round" strokeWidth="1.6" />
          <path d="M11 11h10" stroke="#F27B98" strokeWidth="2.5" />
          <path d="M13 4.5h6" stroke="#F6BF57" strokeLinecap="round" strokeWidth="2.5" />
          <path d="M13 17h6M13 21h4" stroke="#7CC9B8" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "hygiene":
      return (
        <svg {...common}>
          <path d="M7 23 21.5 8.5l3 3L10 26z" fill="#8FD4F2" stroke="#567F9C" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="m19.5 7 1.8-1.8m.3 4.1L24.3 7m-.2 4.7 2.2-1" stroke="#F27794" strokeLinecap="round" strokeWidth="1.8" />
          <path d="M7.5 19.5 12 24" stroke="#FFF7E8" strokeWidth="2" />
          <path d="M7 8.5c0 2-1.5 3.4-3 3.4S1 10.5 1 8.5C1 6.7 4 3.8 4 3.8S7 6.7 7 8.5Z" fill="#79D7C1" />
        </svg>
      );
    case "care":
      return (
        <svg {...common}>
          <rect x="5" y="8" width="22" height="17" rx="5" fill="#FFF3F5" stroke="#C76279" strokeWidth="1.6" />
          <path d="M12 8V6.5A2.5 2.5 0 0 1 14.5 4h3A2.5 2.5 0 0 1 20 6.5V8" stroke="#F0B951" strokeWidth="2" />
          <path d="M16 12v9m-4.5-4.5h9" stroke="#F16D89" strokeLinecap="round" strokeWidth="2.8" />
        </svg>
      );
    case "electronics":
      return (
        <svg {...common}>
          <rect x="8" y="3.5" width="16" height="25" rx="4" fill="#EDE9FF" stroke="#7567A8" strokeWidth="1.6" />
          <path d="m17.5 9-5 8h4l-2 6 6-8h-4z" fill="#F7BE4F" stroke="#C58B23" strokeLinejoin="round" strokeWidth="1" />
          <path d="M14 6h4" stroke="#F2879D" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "food":
      return (
        <svg {...common}>
          <path d="M7 10h16v11a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z" fill="#FFF4D8" stroke="#A57A38" strokeWidth="1.6" />
          <path d="M23 13h1.5a3 3 0 0 1 0 6H23" stroke="#A57A38" strokeWidth="1.8" />
          <path d="M11 6c0 2 2 2 2 4m4-4c0 2 2 2 2 4" stroke="#79BFA8" strokeLinecap="round" strokeWidth="1.8" />
          <path d="M10 21h10" stroke="#F17A91" strokeLinecap="round" strokeWidth="2" />
        </svg>
      );
    case "bag":
      return (
        <svg {...common}>
          <path d="M10 10V8a6 6 0 0 1 12 0v2" stroke="#E99A45" strokeWidth="2" />
          <rect x="5" y="9" width="22" height="18" rx="5" fill="#82D4BD" stroke="#4A927F" strokeWidth="1.6" />
          <path d="M5 16h22" stroke="#FFF8E9" strokeWidth="2" />
          <path d="m12 21 2.2 2 5-5" stroke="#F06483" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
        </svg>
      );
    case "sleep":
      return (
        <svg {...common}>
          <path d="M22.5 22.5A10 10 0 0 1 10 9.2a10.5 10.5 0 1 0 12.5 13.3Z" fill="#B9AEF4" stroke="#7065A8" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="m22 6 .8 2.1L25 9l-2.2.8L22 12l-.8-2.2L19 9l2.2-.9zm4 7 .5 1.3 1.5.6-1.5.5L26 17l-.5-1.6-1.5-.5 1.5-.6z" fill="#F6C45C" />
        </svg>
      );
    case "car":
      return (
        <svg {...common}>
          <path d="m8 15 2-6h12l3 6 2 2v6H5v-6z" fill="#A9D6F2" stroke="#5E86A5" strokeLinejoin="round" strokeWidth="1.6" />
          <path d="M10 15h14l-2.5-4.5h-10z" fill="#EDF9FF" />
          <circle cx="10" cy="24" r="2.5" fill="#685F78" />
          <circle cx="23" cy="24" r="2.5" fill="#685F78" />
          <path d="M8 18h3m10 0h3" stroke="#F07791" strokeLinecap="round" strokeWidth="2" />
        </svg>
      );
    case "home":
      return (
        <svg {...common}>
          <path d="m4 15 12-10 12 10-2.5 2L16 9l-9.5 8z" fill="#F6B85D" stroke="#A77531" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M7.5 15.5V27h17V15.5L16 9z" fill="#FFF5DF" stroke="#A77531" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M13 19h6v8h-6z" fill="#78CEB3" />
          <path d="M9.5 18h3v3h-3zm10 0h3v3h-3z" fill="#9BD7F1" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="m5 10 11-6 11 6-11 6z" fill="#FFD69C" stroke="#9E7441" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M5 10v13l11 6V16zm22 0v13l-11 6V16z" fill="#FFE8BE" stroke="#9E7441" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M16 16v13" stroke="#F27791" strokeWidth="2" />
          <path d="m20.5 8.1-11 6" stroke="#FFF7E9" strokeWidth="2" />
        </svg>
      );
  }
}
