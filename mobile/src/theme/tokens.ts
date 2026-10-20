export const palette = {
  primary: "#3B5BFD",
  primaryDark: "#2A43C9",
  primarySoft: "#E8EDFF",
  violet: "#6C4DF6",
  child: "#FF7A3D",
  childDark: "#EA5F1F",
  childSoft: "#FFF0E6",
  mint: "#12B886",
  mintSoft: "#E3F8F0",
  danger: "#E5484D",
  dangerSoft: "#FDE8E8",
  warn: "#F5A524",
  warnSoft: "#FFF4E0",
  ink: "#0F172A",
  ink2: "#344054",
  muted: "#667085",
  muted2: "#98A2B3",
  line: "#E4E7EC",
  bg: "#F4F5FA",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF1F8",
  white: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const font = {
  h1: 30,
  h2: 24,
  h3: 19,
  title: 17,
  body: 15.5,
  small: 13.5,
  tiny: 11.5,
} as const;

export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  floating: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

export const gradients = {
  parent: ["#3B5BFD", "#6C4DF6"],
  child: ["#FF9A3D", "#FF5E7E"],
  mint: ["#12B886", "#0EA5A0"],
  ink: ["#1E2537", "#3A4460"],
} as const;

export type GradientName = keyof typeof gradients;
