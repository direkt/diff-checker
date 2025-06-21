import { useCallback } from 'react';
import { useError } from '@/components/ErrorToast';

export type ErrorType = 'error' | 'warning' | 'info';

export function useErrorHandling() {
  const { showError } = useError();

  const handleFileError = useCallback((side: 'left' | 'right', error: unknown) => {
    console.error(`Error processing ${side} file:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    showError(`Failed to process ${side} file: ${errorMessage}. Please check if it's a valid profile JSON.`, 'error');
  }, [showError]);

  const handleUploadError = useCallback((error: unknown) => {
    console.error('Error uploading files:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    showError(`Failed to upload files: ${errorMessage}. Please try again.`, 'error');
  }, [showError]);

  const handleValidationError = useCallback((message: string, type: ErrorType = 'warning') => {
    showError(message, type);
  }, [showError]);

  const handleGenericError = useCallback((message: string, error?: unknown, type: ErrorType = 'error') => {
    if (error) {
      console.error(message, error);
    }
    showError(message, type);
  }, [showError]);

  const showSuccess = useCallback((message: string) => {
    showError(message, 'info');
  }, [showError]);

  const showWarning = useCallback((message: string) => {
    showError(message, 'warning');
  }, [showError]);

  return {
    handleFileError,
    handleUploadError,
    handleValidationError,
    handleGenericError,
    showSuccess,
    showWarning,
    showError
  };
}