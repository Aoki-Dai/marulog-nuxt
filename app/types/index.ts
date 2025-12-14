export type ActivityCategoryId =
  | "sleep"
  | "school_work"
  | "move"
  | "meal"
  | "leisure"
  | "other";

export interface ActivityCategory {
  id: ActivityCategoryId;
  label: string;
  color: string; // TailwindクラスまたはHEXコード
  icon: string; // Iconifyアイコン名
}

export interface ActivityLog {
  id: string;
  categoryId: ActivityCategoryId;
  startTime: number;
  endTime: number | null; // nullは計測中を意味する
}

// カテゴリ定数
export const CATEGORIES: ActivityCategory[] = [
  {
    id: "sleep",
    label: "睡眠",
    color: "text-indigo-500 bg-indigo-500",
    icon: "i-lucide-bed",
  },
  {
    id: "school_work",
    label: "学校 / 仕事",
    color: "text-blue-500 bg-blue-500",
    icon: "i-lucide-briefcase",
  },
  {
    id: "move",
    label: "移動",
    color: "text-yellow-500 bg-yellow-500",
    icon: "i-lucide-bus",
  },
  {
    id: "meal",
    label: "食事",
    color: "text-orange-500 bg-orange-500",
    icon: "i-lucide-utensils",
  },
  {
    id: "leisure",
    label: "余暇",
    color: "text-green-500 bg-green-500",
    icon: "i-lucide-gamepad-2",
  },
  {
    id: "other",
    label: "その他",
    color: "text-gray-500 bg-gray-500",
    icon: "i-lucide-align-justify",
  },
];
