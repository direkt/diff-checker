"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ErrorMessage {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  duration?: number;
}

interface ErrorContextType {
  errors: ErrorMessage[];
  showError: (message: string, type?: 'error' | 'warning' | 'info', duration?: number) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorMessage[]>([]);

  const showError = useCallback((message: string, type: 'error' | 'warning' | 'info' = 'error', duration = 5000) => {
    const id = Date.now().toString();
    const newError: ErrorMessage = { id, message, type, duration };
    
    setErrors(prev => [...prev, newError]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeError(id);
      }, duration);
    }
  }, []);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <ErrorContext.Provider value={{ errors, showError, removeError, clearErrors }}>
      {children}
      <ErrorToastContainer />
    </ErrorContext.Provider>
  );
};

const ErrorToastContainer: React.FC = () => {
  const { errors, removeError } = useError();

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2" aria-live="polite">
      {errors.map((error) => (
        <ErrorToastItem key={error.id} error={error} onRemove={removeError} />
      ))}
    </div>
  );
};

interface ErrorToastItemProps {
  error: ErrorMessage;
  onRemove: (id: string) => void;
}

const ErrorToastItem: React.FC<ErrorToastItemProps> = ({ error, onRemove }) => {
  const getStylesForType = (type: ErrorMessage['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-100 border-red-400 text-red-800';
      case 'warning':
        return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      case 'info':
        return 'bg-blue-100 border-blue-400 text-blue-800';
      default:
        return 'bg-red-100 border-red-400 text-red-800';
    }
  };

  const getIconForType = (type: ErrorMessage['type']) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  return (
    <div
      className={`max-w-sm p-4 border-l-4 rounded-r-lg shadow-lg transition-all duration-300 ${getStylesForType(error.type)}`}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 text-lg">
          {getIconForType(error.type)}
        </div>
        <div className="flex-1 text-sm font-medium">
          {error.message}
        </div>
        <button
          onClick={() => onRemove(error.id)}
          className="flex-shrink-0 ml-3 text-lg hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default ErrorProvider;