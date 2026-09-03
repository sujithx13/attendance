import type MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { AttendanceApiError } from "./lib/api";
export const colors = {
  primary: "#0D631B", // Karpagam Emerald
  primaryLight: "#16A34A",
  primarySoft: "#ECFDF5",
  primaryBorder: "#A7F3D0",
  secondary: "#0284C7",
  secondarySoft: "#E0F2FE",
  amber: "#D97706",
  amberSoft: "#FEF3C7",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  bg: "#F8FAFC", // Clean Slate 50 Canvas
  card: "#FFFFFF",
  cardSubtle: "#F1F5F9",
  text: "#0F172A", // Deep Slate 900
  textMuted: "#64748B",
  textSubtle: "#94A3B8",
  border: "#E2E8F0",
  borderSubtle: "#F1F5F9",
  overlay: "rgba(15, 23, 42, 0.65)"
};

export const iconName = (name: React.ComponentProps<typeof MaterialCommunityIcons>["name"]) => name;

export function getErrorMessage(error: unknown) {
  if (error instanceof AttendanceApiError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "The attendance service could not complete that request.";
}

export function formatAmPm(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  let hours = parseInt(parts[0], 10);
  if (isNaN(hours)) return timeStr;
  const minutes = parts[1] ? parts[1].slice(0, 2) : "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
}

export const WEEK_DAYS = [
  { day: 1, name: "Mon", full: "Monday" },
  { day: 2, name: "Tue", full: "Tuesday" },
  { day: 3, name: "Wed", full: "Wednesday" },
  { day: 4, name: "Thu", full: "Thursday" },
  { day: 5, name: "Fri", full: "Friday" },
  { day: 6, name: "Sat", full: "Saturday" }
];

// Reusable Confirmation Popup Modal
