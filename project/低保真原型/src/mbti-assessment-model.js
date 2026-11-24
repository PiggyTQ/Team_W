import questionRows from './i18n/mbti-questions-zh.json' with {type: 'json'};

// The supplied “MBTI 职业性格测试题” gives each marked column one point.
// Question 75 deliberately follows the printed column positions: A → T, B → N.
export const mbtiSections = [
  {id: 1, start: 1, end: 26, prompt: '哪一个答案最能贴切的描绘你一般的感受或行为？'},
  {id: 2, start: 27, end: 58, prompt: '在下列每一对词语中，哪一个词语更合你心意？请仔细想想这些词语的意义，而不要理会他们的字形或读音。'},
  {id: 3, start: 59, end: 78, prompt: '哪一个答案最能贴切地描绘你一般的感受或行为'},
  {id: 4, start: 79, end: 93, prompt: '在下列每一对词语中，哪一个词语更合你心意？'},
];

export const mbtiQuestions = questionRows.map(([id, prompt, textA, textB, letterA, letterB]) => ({
  id,
  prompt,
  options: {
    A: {text: textA, letter: letterA},
    B: {text: textB, letter: letterB},
  },
}));

// The second letter in each pair wins a tie under the questionnaire's rules.
const dimensionPairs = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']];

export function scoreMbtiAssessment(answers = {}) {
  const scores = {E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0};
  const missing = [];
  for (const {id, options} of mbtiQuestions) {
    const answer = answers?.[id];
    if (answer === 'A' || answer === 'B') {
      scores[options[answer].letter] += 1;
    } else {
      missing.push(id);
    }
  }

  const complete = missing.length === 0;
  const dimensions = dimensionPairs.map(([first, second]) => {
    const firstScore = scores[first];
    const secondScore = scores[second];
    const preferred = firstScore > secondScore ? first : second;
    return {
      first,
      second,
      firstScore,
      secondScore,
      winner: complete ? preferred : null,
      tied: complete && firstScore === secondScore,
    };
  });

  const total = mbtiQuestions.length;
  return {
    answered: total - missing.length,
    total,
    missing,
    scores,
    dimensions,
    type: complete ? dimensions.map(dimension => dimension.winner).join('') : null,
  };
}
