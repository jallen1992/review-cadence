#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { type Card, type Deck, type ReviewSnapshot, loadDeck, saveDeck } from './store.js'
import { nextSchedule } from './scheduler.js'

const DEFAULT_FILE = '.cadence-deck.json'

interface ParsedArgs {
  positional: string[]
  flags: Record<string, string | boolean>
}

function parseFlags(args: string[]): ParsedArgs {
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string
    if (arg.startsWith('--')) {
      const name = arg.slice(2)
      const next = args[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        flags[name] = next
        i++
      } else {
        flags[name] = true
      }
    } else {
      positional.push(arg)
    }
  }
  return { positional, flags }
}

function fail(message: string): never {
  process.stderr.write(`error: ${message}\n`)
  process.exit(1)
}

// deck names become filenames, so keep them to characters that are safe
// on every filesystem and can't be read as a path (e.g. "../secrets")
const DECK_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/

function resolveFile(flags: Record<string, string | boolean>): string {
  const explicitFile = typeof flags.file === 'string' ? flags.file : undefined
  const deckName = typeof flags.deck === 'string' ? flags.deck : undefined
  if (explicitFile && deckName) fail('pass either --file or --deck, not both')
  if (deckName) {
    if (!DECK_NAME_PATTERN.test(deckName)) fail('deck name may only contain letters, numbers, "-" and "_"')
    return `.cadence-${deckName}.json`
  }
  return explicitFile ?? DEFAULT_FILE
}

function printResult(asJson: boolean, data: unknown, human: string): void {
  if (asJson) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n')
  } else {
    process.stdout.write(human + '\n')
  }
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2)
  const { positional, flags } = parseFlags(rest)
  const file = resolveFile(flags)
  const asJson = flags.json === true

  switch (command) {
    case 'init': {
      const deck: Deck = { cards: [] }
      saveDeck(file, deck)
      printResult(asJson, { file }, `created empty deck at ${file}`)
      break
    }

    case 'add': {
      const [front, back] = positional
      if (!front || !back) fail('usage: add <front> <back>')
      const deck = loadDeck(file)
      const now = new Date().toISOString()
      const card: Card = {
        id: randomUUID(),
        front,
        back,
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: now,
        lastReviewed: null,
        totalReviews: 0,
        correctReviews: 0,
      }
      deck.cards.push(card)
      saveDeck(file, deck)
      printResult(asJson, card, `added card ${card.id} (due now)`)
      break
    }

    case 'list': {
      const deck = loadDeck(file)
      const human =
        deck.cards.length === 0
          ? 'no cards yet'
          : deck.cards.map((c) => `${c.id}  ${c.front}  due ${c.dueDate}`).join('\n')
      printResult(asJson, deck.cards, human)
      break
    }

    case 'due': {
      const deck = loadDeck(file)
      const cutoff = typeof flags.on === 'string' ? new Date(flags.on) : new Date()
      const dueCards = deck.cards.filter((c) => new Date(c.dueDate) <= cutoff)
      const human = dueCards.length === 0 ? 'nothing due' : dueCards.map((c) => `${c.id}  ${c.front}`).join('\n')
      printResult(asJson, dueCards, human)
      break
    }

    case 'review': {
      const [id, gradeStr] = positional
      if (!id || gradeStr === undefined) fail('usage: review <id> <grade 0-5>')
      const grade = Number(gradeStr)
      if (!Number.isInteger(grade) || grade < 0 || grade > 5) fail('grade must be an integer 0-5')

      const deck = loadDeck(file)
      const card = deck.cards.find((c) => c.id === id)
      if (!card) fail(`no card with id ${id}`)

      const previous: ReviewSnapshot = {
        cardId: card.id,
        interval: card.interval,
        repetitions: card.repetitions,
        easeFactor: card.easeFactor,
        dueDate: card.dueDate,
        lastReviewed: card.lastReviewed,
        totalReviews: card.totalReviews,
        correctReviews: card.correctReviews,
      }

      const now = new Date()
      const next = nextSchedule(
        { interval: card.interval, repetitions: card.repetitions, easeFactor: card.easeFactor },
        grade,
      )
      card.interval = next.interval
      card.repetitions = next.repetitions
      card.easeFactor = next.easeFactor
      card.lastReviewed = now.toISOString()
      card.totalReviews += 1
      if (grade >= 3) card.correctReviews += 1
      const due = new Date(now)
      due.setDate(due.getDate() + next.interval)
      card.dueDate = due.toISOString()
      deck.lastReview = previous

      saveDeck(file, deck)
      printResult(
        asJson,
        card,
        `card ${card.id} scheduled for ${card.dueDate} (interval ${card.interval}d, ease ${card.easeFactor.toFixed(2)})`,
      )
      break
    }

    case 'undo': {
      const deck = loadDeck(file)
      const snapshot = deck.lastReview
      if (!snapshot) fail('nothing to undo')
      const card = deck.cards.find((c) => c.id === snapshot.cardId)
      if (!card) fail(`card ${snapshot.cardId} from the last review no longer exists`)

      card.interval = snapshot.interval
      card.repetitions = snapshot.repetitions
      card.easeFactor = snapshot.easeFactor
      card.dueDate = snapshot.dueDate
      card.lastReviewed = snapshot.lastReviewed
      card.totalReviews = snapshot.totalReviews
      card.correctReviews = snapshot.correctReviews
      delete deck.lastReview

      saveDeck(file, deck)
      printResult(
        asJson,
        card,
        `undid last review of card ${card.id}, back to interval ${card.interval}d, ease ${card.easeFactor.toFixed(2)}`,
      )
      break
    }

    case 'stats': {
      const deck = loadDeck(file)
      const totalReviews = deck.cards.reduce((sum, c) => sum + c.totalReviews, 0)
      const correctReviews = deck.cards.reduce((sum, c) => sum + c.correctReviews, 0)
      const retentionRate = totalReviews === 0 ? null : correctReviews / totalReviews
      const data = { cardCount: deck.cards.length, totalReviews, correctReviews, retentionRate }
      const human =
        totalReviews === 0
          ? `${deck.cards.length} cards, no reviews yet`
          : `${deck.cards.length} cards, ${totalReviews} reviews, ${correctReviews} correct (${(retentionRate! * 100).toFixed(1)}% retention)`
      printResult(asJson, data, human)
      break
    }

    default:
      fail(`unknown command "${command ?? ''}"\nusage: cadence <init|add|list|due|review|undo|stats> [args] [--file path] [--json]`)
  }
}

main()
