import { existsSync, readFileSync, writeFileSync } from 'node:fs'

export interface Card {
  id: string
  front: string
  back: string
  interval: number
  repetitions: number
  easeFactor: number
  dueDate: string
  lastReviewed: string | null
}

export interface Deck {
  cards: Card[]
}

export function loadDeck(path: string): Deck {
  if (!existsSync(path)) {
    throw new Error(`no deck file at ${path} - run "init" first`)
  }
  const raw = readFileSync(path, 'utf8')
  return JSON.parse(raw) as Deck
}

export function saveDeck(path: string, deck: Deck): void {
  // trailing newline so the file plays nicely with diff and cat
  writeFileSync(path, JSON.stringify(deck, null, 2) + '\n', 'utf8')
}
