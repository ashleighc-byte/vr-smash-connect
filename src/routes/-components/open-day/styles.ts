// Shared style constants for Open Day tournament pages
export const COLORS = {
  bg: "#1a1a1a",
  surface: "#1e1e1e",
  surfaceAlt: "#252525",
  text: "#f5f5f5",
  textMuted: "#999",
  red: "#d42b2b",
  blue: "#1e5fa8",
  amber: "#b45309",
  green: "#1a7a4a",
  gold: "#ffd700",
  silver: "#aaaaaa",
  bronze: "#cd7f32",
  border: "#333",
} as const;

export const SIZES = {
  maxWidth: 900,
  radius: 12,
} as const;

export const NAV_LINKS = [
  { path: "/sign-up", label: "Sign Up" },
  { path: "/bracket", label: "Bracket" },
  { path: "/enter-result", label: "Enter Result" },
  { path: "/leaderboard", label: "Leaderboard" },
] as const;
