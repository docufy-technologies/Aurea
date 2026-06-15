import { useMutation } from "@tanstack/react-query";
import { RegisterInput, ApiResponse, ApiErrorResponse } from "../types";

interface RegisterResponseData {
  user: {
    id: string;
    email: string;
    fullName: string;
    isVerified: boolean;
  };
  message: string;
}

interface ConfirmEmailResponseData {
  message: string;
}

/**
 * Hook to handle customer registration API call.
 */
export function useRegisterMutation() {
  return useMutation<
    ApiResponse<RegisterResponseData>,
    ApiErrorResponse["error"],
    RegisterInput
  >({
    mutationFn: async (input) => {
      const response = await fetch("/api/v1/auth/register", {
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
            message: "Failed to register account.",
          }
        );
      }

      return resJson as ApiResponse<RegisterResponseData>;
    },
  });
}

/**
 * Hook to handle email confirmation token verification API call.
 */
export function useConfirmEmailMutation() {
  return useMutation<
    ApiResponse<ConfirmEmailResponseData>,
    ApiErrorResponse["error"],
    string // The token parameter
  >({
    mutationFn: async (token) => {
      const response = await fetch("/api/v1/auth/confirm-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const resJson = await response.json();

      if (!response.ok) {
        throw (
          resJson.error || {
            code: "UNKNOWN_ERROR",
            message: "Failed to verify account.",
          }
        );
      }

      return resJson as ApiResponse<ConfirmEmailResponseData>;
    },
  });
}
