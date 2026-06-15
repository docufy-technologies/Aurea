import { useMutation } from "@tanstack/react-query";
import {
  LoginInput,
  ApiResponse,
  ApiErrorResponse,
  LoginResponse,
} from "../types";
import { useAuthStore } from "../../../stores/auth-store";

/**
 * Hook to handle customer authentication / sign in.
 */
export function useLoginMutation() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation<
    ApiResponse<LoginResponse>,
    ApiErrorResponse["error"],
    LoginInput
  >({
    mutationFn: async (input) => {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const resJson = await response.json();

      if (!response.ok) {
        throw (
          resJson.error || {
            code: "UNKNOWN_ERROR",
            message: "Authentication failed.",
          }
        );
      }

      return resJson as ApiResponse<LoginResponse>;
    },
    onSuccess: (res) => {
      if (res.success && res.data) {
        setAuth(res.data.user, res.data.accessToken);
      }
    },
  });
}

/**
 * Hook to refresh session tokens silently in the background.
 */
export function useRefreshMutation() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation<
    ApiResponse<LoginResponse>,
    ApiErrorResponse["error"],
    void
  >({
    mutationFn: async () => {
      const response = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const resJson = await response.json();

      if (!response.ok) {
        throw (
          resJson.error || {
            code: "UNKNOWN_ERROR",
            message: "Failed to refresh credentials.",
          }
        );
      }

      return resJson as ApiResponse<LoginResponse>;
    },
    onSuccess: (res) => {
      if (res.success && res.data) {
        setAuth(res.data.user, res.data.accessToken);
      }
    },
    onError: () => {
      clearAuth();
    },
  });
}

/**
 * Hook to handle user logout and session teardown.
 */
export function useLogoutMutation() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation<
    ApiResponse<{ message: string }>,
    ApiErrorResponse["error"],
    void
  >({
    mutationFn: async () => {
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const resJson = await response.json();

      if (!response.ok) {
        throw (
          resJson.error || {
            code: "UNKNOWN_ERROR",
            message: "Failed to terminate session.",
          }
        );
      }

      return resJson as ApiResponse<{ message: string }>;
    },
    onSuccess: () => {
      clearAuth();
    },
    onError: () => {
      clearAuth(); // local safety override
    },
  });
}
