import { create } from 'zustand';
import { ActivityItem } from '@/types';
import { generateId } from '@/lib/utils';

interface ActivityState {
  activities: ActivityItem[];
  
  // Actions
  addActivity: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
  clearActivities: () => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],

  addActivity: (activity) => {
    const newActivity: ActivityItem = {
      ...activity,
      id: generateId(),
      timestamp: new Date(),
    };

    set((state) => ({
      activities: [newActivity, ...state.activities].slice(0, 50), // Keep last 50 activities
    }));
  },

  clearActivities: () => set({ activities: [] }),
}));
