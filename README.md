# review-cadence

A command-line spaced-repetition scheduler. It keeps a deck of flashcards
in a local JSON file and tells you which cards are due, using the SM-2
algorithm (the one SuperMemo published in 1987 and most flashcard apps
still build on).

The problem this solves: once you have more than a handful of flashcards,
"review everything" doesn't scale and "review whatever I feel like" means
you forget things right before you'd have needed them. SM-2 grows the
interval between reviews when you get a card right and collapses it back
to a day when you get it wrong, so you spend review time on the cards
that are actually at risk of being forgotten.

This tool does one thing: track cards and tell you when to review them.
It does not do spelling-similarity matching, media attachments, or sync -
if you want that, a full app like Anki is a better fit.

## Usage

Everything lives in `.cadence-deck.json` in the current directory, unless
you pass `--file <path>`.

```
$ cadence init
created empty deck at .cadence-deck.json

$ cadence add "capital of Mongolia" "Ulaanbaatar"
added card 3f2a9e1c-8b7d-4c3a-9e2b-1a4f6d8c0b3e (due now)

$ cadence due
3f2a9e1c-8b7d-4c3a-9e2b-1a4f6d8c0b3e  capital of Mongolia

$ cadence review 3f2a9e1c-8b7d-4c3a-9e2b-1a4f6d8c0b3e 4
card 3f2a9e1c-8b7d-4c3a-9e2b-1a4f6d8c0b3e scheduled for 2026-08-22T09:00:00.000Z (interval 1d, ease 2.50)
```

Grades follow the SM-2 scale: 0-2 means you didn't recall it (interval
resets to a day), 3-5 means you did, with 5 being "trivially easy" and
3 being "recalled with real effort."

Every command accepts `--json` for machine-readable output instead of
the human-readable text above:

```
$ cadence due --json
[
  {
    "id": "3f2a9e1c-8b7d-4c3a-9e2b-1a4f6d8c0b3e",
    "front": "capital of Mongolia",
    "back": "Ulaanbaatar",
    "interval": 0,
    "repetitions": 0,
    "easeFactor": 2.5,
    "dueDate": "2026-08-21T09:00:00.000Z",
    "lastReviewed": null,
    "totalReviews": 0,
    "correctReviews": 0
  }
]
```

`totalReviews` and `correctReviews` (grade >= 3) accumulate across the
card's life and feed the `stats` command:

```
$ cadence stats
12 cards, 40 reviews, 33 correct (82.5% retention)
```

### Commands

- `init` - create an empty deck file
- `add <front> <back>` - add a card, due immediately
- `list` - show every card in the deck
- `due [--on <date>]` - show cards due by now, or by the given date
- `review <id> <grade 0-5>` - record a review and reschedule the card
- `stats` - show review counts and overall retention rate

All commands accept `--file <path>` to use a deck file other than the
default, and `--json` to switch output modes.

## Building

There are no runtime dependencies. Compile with a TypeScript compiler
you already have installed:

```
tsc
node dist/main.js init
```

## License

MIT, see LICENSE.
