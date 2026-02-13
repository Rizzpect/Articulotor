import { create } from 'zustand';

export const useCameraStore = create((set, get) => ({
  // Live metrics (updated every frame)
  eyeContact: 0,        // 0-100%
  posture: 0,           // 0-100%
  gestureCount: 0,      // count of emphatic gestures
  expression: 'neutral', // 'confident' | 'tense' | 'neutral' | 'smiling'
  nervousHabits: 0,     // count of face-touches

  // Status
  isActive: false,
  isLoading: false,
  error: null,

  // Session cumulative averages
  eyeContactSamples: [],
  postureSamples: [],
  expressionLog: [],     // [{label, timestamp}]

  // Actions — live updates (called from RAF loop)
  setEyeContact: (v) => set({ eyeContact: v }),
  setPosture: (v) => set({ posture: v }),
  setGestureCount: (v) => set({ gestureCount: v }),
  setExpression: (v) => set({ expression: v }),
  incrementNervousHabits: () => set((s) => ({ nervousHabits: s.nervousHabits + 1 })),

  // Batch update from analysis frame
  updateMetrics: ({ eyeContact, posture, gestureCount, expression, nervousHabits }) => {
    const s = get();
    const newState = {};

    if (eyeContact !== undefined) {
      newState.eyeContact = eyeContact;
      newState.eyeContactSamples = [...s.eyeContactSamples.slice(-299), eyeContact];
    }
    if (posture !== undefined) {
      newState.posture = posture;
      newState.postureSamples = [...s.postureSamples.slice(-299), posture];
    }
    if (gestureCount !== undefined) newState.gestureCount = gestureCount;
    if (expression !== undefined) {
      newState.expression = expression;
      newState.expressionLog = [
        ...s.expressionLog.slice(-99),
        { label: expression, timestamp: Date.now() },
      ];
    }
    if (nervousHabits) {
      newState.nervousHabits = s.nervousHabits + 1;
    }

    set(newState);
  },

  // Session averages
  getSessionAverages: () => {
    const s = get();
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return {
      eyeContact: Math.round(avg(s.eyeContactSamples)),
      posture: Math.round(avg(s.postureSamples)),
      gestureCount: s.gestureCount,
      nervousHabits: s.nervousHabits,
      dominantExpression: getDominantExpression(s.expressionLog),
    };
  },

  setActive: (v) => set({ isActive: v }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e }),

  reset: () =>
    set({
      eyeContact: 0,
      posture: 0,
      gestureCount: 0,
      expression: 'neutral',
      nervousHabits: 0,
      isActive: false,
      isLoading: false,
      error: null,
      eyeContactSamples: [],
      postureSamples: [],
      expressionLog: [],
    }),
}));

function getDominantExpression(log) {
  if (!log || !log.length) return 'neutral';
  const counts = {};
  for (const entry of log) {
    counts[entry.label] = (counts[entry.label] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || 'neutral';
}
