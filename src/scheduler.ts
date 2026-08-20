export interface ScheduleState {
  interval: number
  repetitions: number
  easeFactor: number
}

/**
 * SM-2, the algorithm SuperMemo published in 1987. A grade below 3 means
 * the reviewer forgot the card, so the interval resets to 1 day instead
 * of growing from the previous one - growing it would just paper over
 * a card they clearly don't know yet.
 */
export function nextSchedule(current: ScheduleState, grade: number): ScheduleState {
  if (grade < 3) {
    return { interval: 1, repetitions: 0, easeFactor: current.easeFactor }
  }

  let interval: number
  if (current.repetitions === 0) {
    interval = 1
  } else if (current.repetitions === 1) {
    interval = 6
  } else {
    interval = Math.round(current.interval * current.easeFactor)
  }

  const easeDelta = 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)
  const easeFactor = Math.max(1.3, current.easeFactor + easeDelta)

  return { interval, repetitions: current.repetitions + 1, easeFactor }
}
