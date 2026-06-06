import { create } from "zustand";

export type AppView = 
  | "login"
  | "asn-home"
  | "asn-form-fill"
  | "admin-dashboard"
  | "admin-forms"
  | "admin-form-create"
  | "admin-form-edit"
  | "admin-asn"
  | "admin-responses"
  | "admin-reports"
  | "admin-announcements"
  | "admin-settings"
  | "admin-users"
  | "admin-activity-logs";

interface AppState {
  currentView: AppView;
  selectedFormId: string | null;
  selectedFormTitle: string | null;
  sidebarOpen: boolean;
  notifications: Array<{ id: string; message: string; type: "info" | "success" | "warning" | "error" }>;

  setCurrentView: (view: AppView) => void;
  setSelectedForm: (id: string | null, title?: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  removeNotification: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "login",
  selectedFormId: null,
  selectedFormTitle: null,
  sidebarOpen: true,
  notifications: [],

  setCurrentView: (view) => set({ currentView: view }),
  setSelectedForm: (id, title) => set({ selectedFormId: id, selectedFormTitle: title || null }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  addNotification: (message, type = "info") => {
    const id = Date.now().toString();
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));
    // Auto remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 5000);
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
