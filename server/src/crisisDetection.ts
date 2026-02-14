export const CRISIS_KEYWORDS_EXPANDED = {
  direct: [
    'kill myself', 'end my life', 'want to die', 'suicide', 'suicidal',
    'self-harm', 'self harm', 'cutting myself', 'hurt myself',
    "don't want to live", 'no reason to live', 'better off dead',
    "can't go on", 'end it all', 'overdose', 'jump off', 'hang myself',
    'slit my wrists', 'take my life', 'shoot myself', 'drown myself',
  ],
  contextual: [
    'no point', 'give up', "can't take it", 'nobody cares',
    'burden to everyone', 'world better without me', 'not worth it',
    'tired of everything', 'done with life', 'escape from everything',
    'goodbye letter', 'final note', "can't do this anymore",
    'no way out', 'nothing matters', 'everyone would be better',
  ],
  protective: [
    'used to feel', 'in the past', 'no longer', 'getting better',
    "glad I didn't", 'happy to be alive', 'grateful', 'recovering',
    'overcame', 'moved past', 'stronger now',
  ],
};

export interface CrisisAssessment {
  level: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  triggers: string[];
  hasProtectiveFactors: boolean;
  shouldShowModal: boolean;
  shouldNotifyAI: boolean;
}

const NEGATIVE_SENTIMENT_WORDS = [
  'hopeless', 'worthless', 'helpless', 'trapped', 'alone',
  'unbearable', 'exhausted', 'broken', 'empty', 'numb',
  'suffering', 'agony', 'despair', 'miserable', 'desperate',
  'useless', 'pathetic', 'failure', 'ruined', 'destroyed',
];

export function assessCrisisLevel(transcript: string): CrisisAssessment {
  const lower = transcript.toLowerCase();

  const hasProtective = CRISIS_KEYWORDS_EXPANDED.protective.some(p => lower.includes(p));

  const directMatches = CRISIS_KEYWORDS_EXPANDED.direct.filter(k => lower.includes(k));
  const contextualMatches = CRISIS_KEYWORDS_EXPANDED.contextual.filter(k => lower.includes(k));
  const negativeCount = NEGATIVE_SENTIMENT_WORDS.filter(w => lower.includes(w)).length;

  let level: CrisisAssessment['level'] = 'none';

  if (directMatches.length > 0 && !hasProtective) {
    level = directMatches.length >= 2 ? 'critical' : 'high';
  } else if (directMatches.length > 0 && hasProtective) {
    level = 'moderate'; // Talking about past crisis but with protective factors
  } else if (contextualMatches.length >= 2) {
    level = 'moderate';
  } else if (contextualMatches.length === 1 || negativeCount >= 4) {
    level = 'low';
  }

  return {
    level,
    triggers: [...directMatches, ...contextualMatches],
    hasProtectiveFactors: hasProtective,
    shouldShowModal: level === 'high' || level === 'critical',
    shouldNotifyAI: level !== 'none',
  };
}
