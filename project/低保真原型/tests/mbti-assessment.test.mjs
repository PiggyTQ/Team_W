import assert from 'node:assert/strict';
import test from 'node:test';
import englishQuestions from '../src/i18n/mbti-questions-en.json' with {type: 'json'};
import {mbtiQuestions, mbtiSections, scoreMbtiAssessment} from '../src/mbti-assessment-model.js';
import {getInterestType} from '../src/interest-assessment-model.js';

const answerEveryQuestion = answer => Object.fromEntries(mbtiQuestions.map(({id}) => [id, answer]));

test('includes all 93 questions in source order with two scored options per question', () => {
  assert.deepEqual(mbtiSections.map(({start, end}) => [start, end]), [[1, 26], [27, 58], [59, 78], [79, 93]]);
  assert.deepEqual(mbtiQuestions.map(({id}) => id), Array.from({length: 93}, (_, index) => index + 1));
  for (const question of mbtiQuestions) {
    const section = mbtiSections.find(({start, end}) => question.id >= start && question.id <= end);
    assert.equal(Boolean(question.prompt), [1, 3].includes(section.id), 'word pairs share the section prompt');
    assert.deepEqual(Object.keys(question.options), ['A', 'B']);
    for (const option of Object.values(question.options)) {
      assert.ok(option.text);
      assert.match(option.letter, /^[EISNTFJP]$/);
    }
  }
});

test('English questions preserve the full source order and the two choices', () => {
  assert.deepEqual(englishQuestions.map(([id]) => id), mbtiQuestions.map(({id}) => id));
  for (const [id, prompt, optionA, optionB] of englishQuestions) {
    assert.equal(Boolean(prompt), Boolean(mbtiQuestions[id - 1].prompt));
    assert.ok(optionA.trim() && optionB.trim());
  }
});

test('counts each selected option exactly once and uses the printed tie rules', () => {
  const allA = scoreMbtiAssessment(answerEveryQuestion('A'));
  assert.equal(allA.answered, 93);
  assert.deepEqual(allA.missing, []);
  assert.deepEqual(allA.scores, {E: 9, I: 12, S: 13, N: 13, T: 12, F: 12, J: 11, P: 11});
  assert.deepEqual(allA.dimensions.map(({first, second, winner, tied}) => [first, second, winner, tied]), [
    ['E', 'I', 'I', false], ['S', 'N', 'N', true], ['T', 'F', 'F', true], ['J', 'P', 'P', true],
  ]);
  assert.equal(allA.type, 'INFP');
  assert.equal(getInterestType(allA.type).group.id, 'NF');

  const allB = scoreMbtiAssessment(answerEveryQuestion('B'));
  assert.deepEqual(allB.scores, {E: 12, I: 9, S: 13, N: 14, T: 12, F: 11, J: 11, P: 11});
  assert.equal(allB.type, 'ENTP');
  assert.equal(getInterestType(allB.type).group.id, 'NT');
});

test('question 75 follows the printed cross-dimension marks', () => {
  assert.equal(mbtiQuestions[74].options.A.letter, 'T');
  assert.equal(mbtiQuestions[74].options.B.letter, 'N');
  const result = scoreMbtiAssessment({...answerEveryQuestion('A'), 75: 'B'});
  assert.deepEqual(result.scores, {E: 9, I: 12, S: 13, N: 14, T: 11, F: 12, J: 11, P: 11});
});

test('leaves the type unset until every question has a valid choice', () => {
  const result = scoreMbtiAssessment({1: 'A', 2: 'B', 3: 'invalid', 94: 'A'});
  assert.equal(result.answered, 2);
  assert.equal(result.total, 93);
  assert.equal(result.type, null);
  assert.deepEqual(result.missing, Array.from({length: 91}, (_, index) => index + 3));
  assert.deepEqual(result.scores, {E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 2, P: 0});
  assert.ok(result.dimensions.every(({tied, winner}) => !tied && winner === null));
  assert.equal(scoreMbtiAssessment().answered, 0);
  assert.equal(scoreMbtiAssessment(null).answered, 0);
});
