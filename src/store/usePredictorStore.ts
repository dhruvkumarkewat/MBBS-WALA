import { create } from 'zustand';

export interface PredictorStoreState {
  aiResponse: any | null;
  loading: boolean;
  showOverlay: boolean;
  error: string;
  currentStep: number;
  setAiResponse: (res: any) => void;
  setLoading: (loading: boolean) => void;
  setShowOverlay: (show: boolean) => void;
  setError: (error: string) => void;
  setCurrentStep: (step: number | ((prev: number) => number)) => void;
  reset: () => void;
}

export const usePredictorStore = create<PredictorStoreState>((set) => ({
  aiResponse: null,
  loading: false,
  showOverlay: false,
  error: '',
  currentStep: 0,
  setAiResponse: (aiResponse) => set({ aiResponse }),
  setLoading: (loading) => set({ loading }),
  setShowOverlay: (showOverlay) => set({ showOverlay }),
  setError: (error) => set({ error }),
  setCurrentStep: (step) => set((state) => ({ 
    currentStep: typeof step === 'function' ? step(state.currentStep) : step 
  })),
  reset: () => set({ aiResponse: null, loading: false, showOverlay: false, error: '', currentStep: 0 })
}));
