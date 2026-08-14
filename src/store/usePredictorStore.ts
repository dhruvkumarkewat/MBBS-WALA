import { create } from 'zustand';

export interface PredictorStoreState {
  aiResponse: any | null;
  loading: boolean;
  showOverlay: boolean;
  error: string;
  setAiResponse: (res: any) => void;
  setLoading: (loading: boolean) => void;
  setShowOverlay: (show: boolean) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const usePredictorStore = create<PredictorStoreState>((set) => ({
  aiResponse: null,
  loading: false,
  showOverlay: false,
  error: '',
  setAiResponse: (aiResponse) => set({ aiResponse }),
  setLoading: (loading) => set({ loading }),
  setShowOverlay: (showOverlay) => set({ showOverlay }),
  setError: (error) => set({ error }),
  reset: () => set({ aiResponse: null, loading: false, showOverlay: false, error: '' })
}));
