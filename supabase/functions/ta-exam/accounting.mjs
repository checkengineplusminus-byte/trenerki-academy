import {buildCorePracticeProgress} from '../../../src/accounting/core-progress.js';
import {homeworkProgress} from '../../../src/accounting/homework-core.js';
import {auditMonthWorkflow} from '../../../src/accounting/simulator-core.js';

export function accountingExamReadiness(materials, answers, homeworks, workspaces) {
  const topics = Array.from({length:100}, (_, index) => ({topic_no:index + 1}));
  const completeProgramme = materials.length === 100 &&
    new Set(materials.map(row => row.topic_no)).size === 100 &&
    materials.every(row => row.topic_no >= 1 && row.topic_no <= 100 &&
      Array.isArray(row.material?.exercises) && row.material.exercises.length === 8);
  const practice = buildCorePracticeProgress(topics, materials, answers, {
    materialsReady:true, answersReady:true
  });
  const homework = homeworkProgress(homeworks, topics.map(row => row.topic_no));
  const submitted = new Set(homework?.topics || []);
  const completed = topics.filter(row =>
    practice.byTopic[row.topic_no]?.passed && submitted.has(row.topic_no)).length;
  const scenario = materials.find(row => row.topic_no === 96)?.material?.scenario;
  let monthComplete = false;
  if (scenario) {
    monthComplete = workspaces.some(workspace => {
      try { return auditMonthWorkflow(scenario, workspace.state).training_consistent; }
      catch { return false; }
    });
  }
  return {
    completed, total:100, month_complete:monthComplete,
    ready:completeProgramme && completed === 100 && monthComplete
  };
}

// The authored questions stay in the protected materials. Only the current
// question and shuffled options are returned by the exam endpoint.
export function accountingExamBank(materials) {
  return materials.flatMap(row => (row.material?.exercises || [])
    .filter(exercise => exercise.type === 'choice' &&
      typeof exercise.prompt === 'string' && exercise.prompt.trim() &&
      Array.isArray(exercise.choices) && exercise.choices.length >= 2 &&
      exercise.choices.length <= 6 &&
      exercise.choices.every(option => typeof option === 'string' && option.trim()) &&
      new Set(exercise.choices).size === exercise.choices.length &&
      Number.isInteger(exercise.correctIndex) && exercise.correctIndex >= 0 &&
      exercise.correctIndex < exercise.choices.length)
    .map(exercise => ({
      lesson_no:row.topic_no - 1,
      advanced:row.topic_no >= 91,
      question:exercise.prompt.trim().slice(0,1150),
      question_options:exercise.choices.map(option => option.trim().slice(0,450)),
      correct_option:exercise.correctIndex,
      expected_answer:(exercise.choices[exercise.correctIndex] + '. ' +
        (exercise.explanation || '')).slice(0,1100)
    })));
}
