import { create } from 'zustand';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const useAppStore = create((set) => ({
  // Session state
  currentSession: null,
  currentScenario: null,
  mode: 'chat', // 'chat' | 'voice' | 'camera'

  // Chat
  chatMessages: [],
  isAiTyping: false,

  // Voice metrics
  wpm: 0,
  fillerCount: 0,
  elapsedTime: 0,

  // Actions
  setCurrentSession: (session) => set({ currentSession: session }),
  setCurrentScenario: (scenario) => set({ currentScenario: scenario }),
  setMode: (mode) => set({ mode }),

  addChatMessage: (role, content, analysis = null) =>
    set((s) => ({
      chatMessages: [
        ...s.chatMessages,
        { id: generateId(), role, content, analysis, timestamp: new Date() },
      ],
    })),
  clearChat: () => set({ chatMessages: [] }),
  setIsAiTyping: (v) => set({ isAiTyping: v }),

  setWpm: (wpm) => set({ wpm }),
  setFillerCount: (fillerCount) => set({ fillerCount }),
  setElapsedTime: (elapsedTime) => set({ elapsedTime }),

  resetSession: () =>
    set({
      currentSession: null,
      currentScenario: null,
      mode: 'chat',
      chatMessages: [],
      isAiTyping: false,
      wpm: 0,
      fillerCount: 0,
      elapsedTime: 0,
    }),
}));
