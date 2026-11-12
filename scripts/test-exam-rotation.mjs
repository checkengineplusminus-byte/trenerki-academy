import assert from 'node:assert/strict';
import { nextChoice, questionKey } from '../supabase/functions/ta-exam/selection.ts';

function makeQuestion(id, lesson = id, optionsCount = 3) {
  const answers = Object.freeze(Array.from({ length: optionsCount }, (_, index) => `Odpowiedź ${id}-${index}`));
  return Object.freeze({
    lesson_no: lesson,
    question: `Scenariusz egzaminacyjny ${id}`,
    expected_answer: `Wyjaśnienie ${id}`,
    question_options: answers,
    correct_option: id % optionsCount,
  });
}

function answered(choice) {
  return {
    question: choice.question,
    lesson_no: choice.lesson_no,
    correct_option: choice.correct_option,
  };
}

function checkShuffledAnswer(choice, original) {
  assert.ok(choice, 'Every reserved exam step receives a question');
  assert.ok(original, 'Every question comes from the supplied bank');
  assert.equal(choice.question_options.length, original.question_options.length);
  assert.deepEqual([...choice.question_options].sort(), [...original.question_options].sort());
  assert.equal(choice.question_options[choice.correct_option], original.question_options[original.correct_option]);
}

function seededRandom(initial) {
  let state = initial;
  return (length) => {
    assert.ok(Number.isSafeInteger(length) && length > 0, 'The sampler receives a non-empty range');
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % length;
  };
}

const first = () => 0;
assert.equal(questionKey('  Sprawdź   stan\nplomby  '), questionKey('sprawdź stan plomby'));

const bank = Object.freeze(Array.from({ length: 180 }, (_, id) => makeQuestion(id, Math.floor(id / 3), id % 2 === 0 ? 3 : 4)));
const originals = new Map(bank.map((question) => [questionKey(question.question), question]));
const attempts = [];
const seen = new Set();
const randomIndex = seededRandom(14785);

// Seven practice questions plus the final and the extra exhaust the maximum
// number of slots allowed by the currently deployed assessment flow.
const phases = [...Array(7).fill('practice'), 'final', 'extra'];
for (let attempt = 0; attempt < 20; attempt++) {
  const history = [];
  for (const phase of phases) {
    const choice = nextChoice(bank, history, phase, attempts.slice(0, 19), randomIndex);
    assert.ok(choice, `Attempt ${attempt + 1} must have nine available questions`);
    const key = questionKey(choice.question);
    checkShuffledAnswer(choice, originals.get(key));
    assert.equal(seen.has(key), false, `Question repeated before the end of attempt ${attempt + 1}`);
    const recent = history.slice(-2);
    if (recent.length === 2 && recent[0].correct_option === recent[1].correct_option) {
      assert.notEqual(choice.correct_option, recent[0].correct_option, 'Correct position cannot repeat three times');
    }
    seen.add(key);
    history.push(answered(choice));
  }
  attempts.unshift({ history, question: null });
}
assert.equal(seen.size, 180);

const firstAttempt = new Set(attempts.at(-1).history.map(({ question }) => questionKey(question)));
const twentyFirst = nextChoice(bank, [], 'practice', attempts.slice(0, 19), randomIndex);
assert.ok(twentyFirst && firstAttempt.has(questionKey(twentyFirst.question)), 'Attempt 21 can reuse the oldest attempt');

const practice = makeQuestion(10, 2, 3);
const expert = makeQuestion(11, 39, 4);
assert.equal(nextChoice([practice, expert], [], 'final', [], first)?.question, expert.question);
assert.equal(
  nextChoice([practice, expert], [], 'final', [{ history: [], question: expert.question }], first)?.question,
  practice.question,
  'A fresh question outranks a previously shown expert question',
);

const recentQuestion = makeQuestion(1);
const middleQuestion = makeQuestion(2);
const oldestQuestion = makeQuestion(3);
const currentQuestion = makeQuestion(4);
const smallBank = [recentQuestion, middleQuestion, oldestQuestion, currentQuestion];
const prior = [
  { history: [answered(recentQuestion)], question: null },
  { history: [], question: middleQuestion.question },
  { history: [answered(oldestQuestion)], question: null },
];
assert.equal(
  nextChoice(smallBank, [answered(currentQuestion)], 'practice', prior, first)?.question,
  oldestQuestion.question,
  'A small bank reuses the least recently shown question and excludes the current session',
);
assert.equal(nextChoice(smallBank, smallBank.map(answered), 'practice', prior, first), null);

const withUnanswered = nextChoice(
  [recentQuestion, middleQuestion],
  [],
  'practice',
  [{ history: [], question: ` ${recentQuestion.question.toUpperCase()}  ` }],
  first,
);
assert.equal(withUnanswered?.question, middleQuestion.question, 'An unanswered prior question still counts as shown');

for (const fixture of [practice, expert]) {
  const baseline = nextChoice([fixture], [], 'practice', [], first);
  checkShuffledAnswer(baseline, fixture);
  const history = [makeQuestion(21), makeQuestion(22)].map((priorQuestion) => ({
    ...answered(priorQuestion),
    correct_option: baseline.correct_option,
  }));
  const shuffled = nextChoice([fixture], history, 'practice', [], first);
  checkShuffledAnswer(shuffled, fixture);
  assert.notEqual(shuffled.correct_option, baseline.correct_option, 'Repeated deterministic randomness must still break a three-position streak');
}

console.log('Exam rotation passed: 180 unique questions across 20 attempts, attempt 21 reuse, pending questions, expert preference, small-bank fallback, and correct positions.');
