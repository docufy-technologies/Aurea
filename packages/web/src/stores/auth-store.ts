import { create } from "zustand";
import { UserDto } from "@aurea/shared";

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  setAuth: (user: UserDto, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Try to pre-load user from localStorage to preserve UI state
  const storedUser = localStorage.getItem("aurea_user");
  let initialUser: UserDto | null = null;

  if (storedUser) {
    try {
      initialUser = JSON.parse(storedUser);
    } catch {
      localStorage.removeItem("aurea_user");
    }
  }

  return {
    user: initialUser,
    accessToken: null, // access token is kept in-memory for security
    isAuthenticated: !!initialUser,
    loading: false,
    setAuth: (user, accessToken) => {
      localStorage.setItem("aurea_user", JSON.stringify(user));
      set({
        user,
        accessToken,
        isAuthenticated: true,
        loading: false,
      });
    },
    clearAuth: () => {
      localStorage.removeItem("aurea_user");
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        loading: false,
      });
    },
    setLoading: (loading) => set({ loading }),
  };
});
