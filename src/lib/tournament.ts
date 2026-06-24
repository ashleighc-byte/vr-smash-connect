export const SCHOOLS = [
  "Piopio College",
  "Taumarunui High School",
  "Ōtorohanga College",
  "Te Kuiti High School",
] as const;

export type School = (typeof SCHOOLS)[number];

export type MatchDay =
  | "Monday 31 Aug"
  | "Tuesday 1 Sep"
  | "Wednesday 2 Sep"
  | "Thursday 3 Sep"
  | "Friday 4 Sep";

export interface ScheduledMatch {
  day: MatchDay;
  label: string;
  schoolA: School;
  schoolB: School;
  isKnockout: boolean;
}

export const SCHEDULE: ScheduledMatch[] = [
  { day: "Monday 31 Aug", label: "Piopio vs Taumarunui", schoolA: "Piopio College", schoolB: "Taumarunui High School", isKnockout: false },
  { day: "Monday 31 Aug", label: "Ōtorohanga vs Te Kuiti", schoolA: "Ōtorohanga College", schoolB: "Te Kuiti High School", isKnockout: false },
  { day: "Tuesday 1 Sep", label: "Piopio vs Ōtorohanga", schoolA: "Piopio College", schoolB: "Ōtorohanga College", isKnockout: false },
  { day: "Tuesday 1 Sep", label: "Taumarunui vs Te Kuiti", schoolA: "Taumarunui High School", schoolB: "Te Kuiti High School", isKnockout: false },
  { day: "Wednesday 2 Sep", label: "Piopio vs Te Kuiti", schoolA: "Piopio College", schoolB: "Te Kuiti High School", isKnockout: false },
  { day: "Wednesday 2 Sep", label: "Taumarunui vs Ōtorohanga", schoolA: "Taumarunui High School", schoolB: "Ōtorohanga College", isKnockout: false },
  { day: "Thursday 3 Sep", label: "Semi-final 1 (1st vs 4th)", schoolA: "TBC", schoolB: "TBC", isKnockout: true },
  { day: "Thursday 3 Sep", label: "Semi-final 2 (2nd vs 3rd)", schoolA: "TBC", schoolB: "TBC", isKnockout: true },
  { day: "Friday 4 Sep", label: "Bronze match", schoolA: "TBC", schoolB: "TBC", isKnockout: true },
  { day: "Friday 4 Sep", label: "Grand final", schoolA: "TBC", schoolB: "TBC", isKnockout: true },
];

export const ROUND_ROBIN_DAYS: MatchDay[] = [
  "Monday 31 Aug",
  "Tuesday 1 Sep",
  "Wednesday 2 Sep",
];

export interface TournamentRoster {
  id: string;
  school: School;
  player_slot: string;
  student_name: string;
  created_at: string;
}

export interface MatchResult {
  id: string;
  match_day: MatchDay;
  school_a: School;
  school_b: School;
  player_a: string;
  player_b: string;
  game1_a: number;
  game1_b: number;
  game2_a: number;
  game2_b: number;
  game3_a: number | null;
  game3_b: number | null;
  games_won_a: number;
  games_won_b: number;
  points_a: number;
  points_b: number;
  walkover: boolean;
  created_at: string;
}
