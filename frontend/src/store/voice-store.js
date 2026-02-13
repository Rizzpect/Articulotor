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

export const useVoiceStore = create((set) => ({
  // Voice orb state
  state: 'idle', // 'idle' | 'listening' | 'processing' | 'speaking'
  audioLevel: 0,

  // Conversation
  messages: [],
  currentTranscript: '',

  // UI
  isHistoryOpen: false,
  error: null,

  // Actions
  setState: (state) => set({ state }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setCurrentTranscript: (currentTranscript) => set({ currentTranscript }),
  addMessage: (role, content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: generateId(),
          role,
          content,
          timestamp: new Date(),
        },
      ],
    })),
  clearMessages: () => set({ messages: [] }),
  toggleHistory: () => set((s) => ({ isHistoryOpen: !s.isHistoryOpen })),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      state: 'idle',
      audioLevel: 0,
      messages: [],
      currentTranscript: '',
      isHistoryOpen: false,
      error: null,
    }),
}));
