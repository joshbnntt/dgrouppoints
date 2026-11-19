// Sheet columns C..G, in this order. Edit labels/points here.
export const CATEGORIES = [
  { key: 'game', label: 'Game', short: 'Game', pts: 10 },
  { key: 'memory', label: 'Scripture Memory', short: 'Memory', pts: 5 },
  { key: 'trait', label: 'Character Trait', short: 'Trait', pts: 5 },
  { key: 'verse', label: 'Trait Verse', short: 'Verse', pts: 5 },
  { key: 'study', label: 'Study Completed', short: 'Study', pts: 20 },
] as const

export type Person = { row: number; name: string; team: string; pts: number[] }
