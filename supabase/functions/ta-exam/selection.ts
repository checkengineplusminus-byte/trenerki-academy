export type Choice = {
  lesson_no: number
  advanced?: boolean
  question: string
  expected_answer: string
  question_options: string[]
  correct_option: number
}

type HistoryEntry = { question?: string; lesson_no?: number; correct_option?: number }
type PreviousAttempt = { history?: HistoryEntry[]; question?: string | null }
type RandomIndex = (length: number) => number

export function questionKey(question: string): string {
  return question.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl')
}

function secureRandomIndex(length: number): number {
  const value = new Uint32Array(1)
  const ceiling = Math.floor(0x100000000 / length) * length
  do {
    crypto.getRandomValues(value)
  } while (value[0] >= ceiling)
  return value[0] % length
}

export const examAttemptWindow = 20
export const maxExamQuestions = 9

export function nextChoice(
  bank: Choice[],
  history: HistoryEntry[],
  phase: string,
  previousAttempts: PreviousAttempt[] = [],
  randomIndex: RandomIndex = secureRandomIndex,
): Choice | null {
  const usedQuestions = new Set(history.map(entry => questionKey(entry.question ?? '')))
  const usedLessons = new Set(history.map(entry => entry.lesson_no))
  const mostRecentUse = new Map<string, number>()
  for (const [index, attempt] of previousAttempts.slice(0, examAttemptWindow - 1).entries()) {
    for (const prompt of [attempt.question, ...(attempt.history ?? []).map(entry => entry.question)]) {
      if (!prompt) continue
      const key = questionKey(prompt)
      if (!mostRecentUse.has(key)) mostRecentUse.set(key, index)
    }
  }

  const remaining = bank.filter(choice => !usedQuestions.has(questionKey(choice.question)))
  if (!remaining.length) return null
  const age = (choice: Choice) => mostRecentUse.get(questionKey(choice.question)) ?? Infinity
  // A short bank still uses all fresh prompts before it can reuse the oldest ones.
  const oldest = Math.max(...remaining.map(age))
  const available = remaining.filter(choice => age(choice) === oldest)
  const legacyExpertMin = Math.max(0, ...bank.filter(choice => choice.advanced === undefined).map(choice => choice.lesson_no)) - 9
  const experts = phase === 'final' || phase === 'extra'
    ? available.filter(choice => choice.advanced ?? (choice.lesson_no >= legacyExpertMin))
    : []
  const newLesson = available.filter(choice => !usedLessons.has(choice.lesson_no))
  const newExpertLesson = experts.filter(choice => !usedLessons.has(choice.lesson_no))
  const candidates = [newExpertLesson, newLesson, experts, available].find(group => group.length)!
  const choice = candidates[randomIndex(candidates.length)]

  const order = choice.question_options.map((_, index) => index)
  for (let index = order.length - 1; index > 0; index--) {
    const other = randomIndex(index + 1)
    ;[order[index], order[other]] = [order[other], order[index]]
  }
  let correctPosition = order.indexOf(choice.correct_option)
  const [last, beforeLast] = history.slice(-2).reverse()
  if (last?.correct_option === correctPosition && beforeLast?.correct_option === correctPosition) {
    const offset = 1 + randomIndex(order.length - 1)
    const newPosition = (correctPosition + offset) % order.length
    ;[order[correctPosition], order[newPosition]] = [order[newPosition], order[correctPosition]]
    correctPosition = newPosition
  }
  return {
    ...choice,
    question_options: order.map(index => choice.question_options[index]),
    correct_option: correctPosition,
  }
}
