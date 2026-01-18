export const PROGRAMMES = ["BELE", "BSCE", "BBIO", "BSTE"] as const;
export type Programme = (typeof PROGRAMMES)[number];

