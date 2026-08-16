// OrageRadar Confidence Engine v0.1
// Pure functions only: no network access. This is deliberately explainable.

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function weightedMean(items) {
  const valid = items.filter(item => Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0);
  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return null;
  return valid.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

function dispersionPenalty(items, mean) {
  const values = items.filter(item => Number.isFinite(item.value)).map(item => item.value);
  if (values.length < 2 || !Number.isFinite(mean)) return 0;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  return clamp(std * 1.5, 0, 35);
}

/**
 * inputs: [{ id, probability: 0..100, weight }]
 * observations: optional [{ id, probability: 0..100, weight }]
 */
function probabilityConsensus({ inputs = [], observations = [] } = {}) {
  const modelItems = inputs.map(item => ({ id: item.id, value: Number(item.probability), weight: Number(item.weight) || 1 }));
  const obsItems = observations.map(item => ({ id: item.id, value: Number(item.probability), weight: Number(item.weight) || 2 }));
  const all = [...modelItems, ...obsItems];
  const probability = weightedMean(all);

  if (!Number.isFinite(probability)) {
    return { probability: null, confidence: 0, agreement: 0, contributors: 0 };
  }

  const penalty = dispersionPenalty(all, probability);
  const coverage = clamp((all.length / 5) * 100);
  const agreement = clamp(100 - penalty * 2);
  const confidence = clamp(agreement * 0.7 + coverage * 0.3);

  return {
    probability: Math.round(clamp(probability)),
    confidence: Math.round(confidence),
    agreement: Math.round(agreement),
    contributors: all.length,
    explanation: {
      modelCount: modelItems.length,
      observationCount: obsItems.length,
      dispersionPenalty: Math.round(penalty * 10) / 10
    }
  };
}

module.exports = { probabilityConsensus };
