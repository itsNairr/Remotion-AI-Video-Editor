import { toast } from 'sonner';
import { HttpError } from './https';

export interface ApiCallOptions {
  successToast?: string;
  errorToastPrefix?: string;
  silent?: boolean;
}

/**
 * Executes an async API call with centralized error and success toast notifications
 */
export async function executeApi<T>(
  apiCall: () => Promise<T>,
  options: ApiCallOptions = {}
): Promise<T> {
  const { successToast, errorToastPrefix = 'Error', silent = false } = options;

  try {
    const result = await apiCall();

    if (successToast && !silent) {
      toast.success(successToast);
    }

    return result;
  } catch (error: unknown) {
    const errorMessage = extractErrorMessage(error);

    if (!silent) {
      toast.error(`${errorToastPrefix}: ${errorMessage}`);
    }

    // Re-throw so caller composables or components can handle local state if necessary
    throw error;
  }
}

/**
 * Extracts a human-friendly error message from unknown errors
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 404) return 'The requested resource was not found.';
    if (error.status === 401) return 'Unauthorized. Please check your credentials.';
    if (error.status === 429) return 'Too many requests. Please slow down.';
    if (error.status >= 500) return 'Server error occurred. Please try again later.';
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred.';
}
