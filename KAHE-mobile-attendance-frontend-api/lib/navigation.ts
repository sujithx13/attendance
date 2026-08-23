/** Role-aware mobile navigation that keeps the simplified scanner-first attendance flow focused. */
import type MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps } from "react";

export type Role = "student" | "faculty";
export type Screen = "home" | "attendance" | "qr" | "history" | "classroom" | "scanner" | "profile";
type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
export type MobileTab = { label: string; icon: IconName; screen: Screen };

export function getTabs(role: Role): MobileTab[] {
  return role === "student"
    ? [
        { label: "Home", icon: "home-variant-outline", screen: "home" },
        { label: "Scan", icon: "qrcode-scan", screen: "attendance" },
        { label: "My QR", icon: "qrcode", screen: "qr" },
        { label: "History", icon: "chart-donut", screen: "history" },
        { label: "Profile", icon: "account-outline", screen: "profile" }
      ]
    : [
        { label: "Home", icon: "home-variant-outline", screen: "home" },
        { label: "Live QR", icon: "presentation-play", screen: "classroom" },
        { label: "Scan", icon: "barcode-scan", screen: "scanner" },
        { label: "Profile", icon: "account-outline", screen: "profile" }
      ];
}
