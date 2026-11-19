// Categories now live in the sheet's "Categories" tab (Label | Short | Points | Show).
// Row order there = column order in the Roster tab, starting at column C.
// These defaults seed that tab the first time the app runs.
export type Category = { label: string; short: string; pts: number; show: boolean }

export const DEFAULT_CATEGORIES: Category[] = [
  { label: 'Game', short: 'Game', pts: 10, show: true },
  { label: 'Scripture Memory', short: 'Memory', pts: 5, show: true },
  { label: 'Character Trait', short: 'Trait', pts: 5, show: true },
  { label: 'Trait Verse', short: 'Verse', pts: 5, show: true },
  { label: 'Study Completed', short: 'Study', pts: 20, show: true },
]

export type Person = { row: number; name: string; team: string; pts: number[] }
export type Data = { categories: Category[]; people: Person[] }
