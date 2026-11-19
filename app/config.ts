// Sheet columns C..G, in this order. Edit labels/points here.
export const CATEGORIES = [
  { key: 'game', label: 'Game', pts: 10 },
  { key: 'memory', label: 'Scripture Memory', pts: 5 },
  { key: 'trait', label: 'Character Trait', pts: 5 },
  { key: 'verse', label: 'Trait Verse', pts: 5 },
  { key: 'study', label: 'Study Completed', pts: 20 },
] as const

export type Person = { row: number; name: string; team: string; pts: number[] }
