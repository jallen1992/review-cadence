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
  totalReviews: number
  correctReviews: number
}

// enough of a card's prior state to put it back after a review, so
// "undo" doesn't need a full history log - just the one step back
export interface ReviewSnapshot {
  cardId: string
  interval: number
  repetitions: number
  easeFactor: number
  dueDate: string
  lastReviewed: string | null
  totalReviews: number
  correctReviews: number
}

export interface Deck {
  cards: Card[]
  lastReview?: ReviewSnapshot
}

export function loadDeck(path: string): Deck {
  if (!existsSync(path)) {
    throw new Error(`no deck file at ${path} - run "init" first`)
  }
  const raw = readFileSync(path, 'utf8')
  const deck = JSON.parse(raw) as Deck
  // decks written before totalReviews/correctReviews existed don't have them
  for (const card of deck.cards) {
    card.totalReviews ??= 0
    card.correctReviews ??= 0
  }
  return deck
}

export function saveDeck(path: string, deck: Deck): void {
  // trailing newline so the file plays nicely with diff and cat
  writeFileSync(path, JSON.stringify(deck, null, 2) + '\n', 'utf8')
}
