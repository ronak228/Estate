import { toast } from 'sonner';

/**
 * Thin wrapper around sonner so the rest of the app calls one small,
 * intention-revealing API instead of importing `toast` everywhere.
 */
export const showSuccess = (message, options) => toast.success(message, options);
export const showError = (message, options) => toast.error(message, options);
export const showWarning = (message, options) => toast.warning(message, options);
export const showInfo = (message, options) => toast.info(message, options);

/**
 * Extracts a user-friendly message from an axios error, falling back to a
 * caller-supplied default. Mirrors the `err.response?.data?.message` pattern
 * already used inline across every form/page.
 */
export const getErrorMessage = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || fallback;
