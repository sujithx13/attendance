/** Role-aware mobile navigation with Universal Scanner and class-specific QR passes. */
import type MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps } from "react";

export type Role = "student" | "faculty";
export type Screen = "home" | "timetable" | "scanner" | "profile";
type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
export type MobileTab = { label: string; icon: IconName; screen: Screen };

export function getTabs(role: Role): MobileTab[] {
  return [
    { label: "Home", icon: "home-variant-outline", screen: "home" },
    { label: role === "faculty" ? "Schedule" : "Timetable", icon: "calendar-clock", screen: "timetable" },
    { label: "Scan QR", icon: "qrcode-scan", screen: "scanner" },
    { label: "Profile", icon: "account-outline", screen: "profile" }
  ];
}
