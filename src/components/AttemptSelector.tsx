import React from 'react';
import { MultiAttemptQuery, QueryAttempt } from '@/types/multipleAttempts';

interface AttemptSelectorProps {
  multiAttemptQuery: MultiAttemptQuery;
  selectedAttemptNumber: number;
  onAttemptSelect: (attemptNumber: number) => void;
  side: 'left' | 'right';
}

const AttemptSelector: React.FC<AttemptSelectorProps> = ({
  multiAttemptQuery,
  selectedAttemptNumber,
  onAttemptSelect,
  side
}) => {
  const getStatusColor = (status: QueryAttempt['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'timeout':
        return 'text-yellow-600 bg-yellow-50';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: QueryAttempt['status']) => {
    switch (status) {
      case 'success':
        return '✓';
      case 'failed':
        return '✗';
      case 'timeout':
        return '⏱';
      case 'cancelled':
        return '⊘';
      default:
        return '?';
    }
  };

  const formatDuration = (durationMs: number) => {
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    }
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {side === 'left' ? 'Source' : 'Target'} Query Attempts 
        <span className="text-gray-500 ml-1">
          ({multiAttemptQuery.totalAttempts} attempts)
        </span>
      </label>
      
      {/* Attempt Tabs */}
      <div className="flex flex-wrap gap-1 mb-3">
        {multiAttemptQuery.attempts.map((attempt) => (
          <button
            key={attempt.attemptNumber}
            onClick={() => onAttemptSelect(attempt.attemptNumber)}
            className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
              selectedAttemptNumber === attempt.attemptNumber
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded-full text-center text-xs leading-3 ${getStatusColor(attempt.status)}`}>
                {getStatusIcon(attempt.status)}
              </span>
              <span>
                {attempt.attemptNumber === 0 ? 'Initial' : `Retry ${attempt.attemptNumber}`}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Attempt Details */}
      {(() => {
        const selectedAttempt = multiAttemptQuery.attempts.find(
          a => a.attemptNumber === selectedAttemptNumber
        );
        
        if (!selectedAttempt) return null;
        
        return (
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Attempt:</span>
                <span className="ml-2">
                  {selectedAttempt.attemptNumber === 0 ? 'Initial' : `Retry ${selectedAttempt.attemptNumber}`}
                  {selectedAttempt.attemptNumber > 0 && (
                    <span className="text-gray-500 ml-1">
                      ({selectedAttempt.attemptNumber + 1} of {multiAttemptQuery.totalAttempts})
                    </span>
                  )}
                </span>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedAttempt.status)}`}>
                  {getStatusIcon(selectedAttempt.status)} {selectedAttempt.status.toUpperCase()}
                </span>
              </div>
              
              {selectedAttempt.timestamp.duration > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="ml-2">{formatDuration(selectedAttempt.timestamp.duration)}</span>
                </div>
              )}
              
              {selectedAttempt.errorId && (
                <div>
                  <span className="font-medium text-gray-700">Error ID:</span>
                  <span className="ml-2 font-mono text-xs text-gray-600">
                    {selectedAttempt.errorId.slice(0, 8)}...
                  </span>
                </div>
              )}
            </div>
            
            {selectedAttempt.timestamp.start && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-700">Time Range:</span>
                <span className="ml-2 text-xs text-gray-600">
                  {new Date(selectedAttempt.timestamp.start).toLocaleTimeString()} - {new Date(selectedAttempt.timestamp.end).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        );
      })()}
      
      {/* Retry Pattern Summary */}
      {multiAttemptQuery.retryPattern.retryIntervals.length > 0 && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
          <div className="font-medium text-blue-800 mb-1">Retry Pattern Analysis</div>
          <div className="text-blue-700">
            <span className="font-medium">Backoff Type:</span> {multiAttemptQuery.retryPattern.backoffType}
            {multiAttemptQuery.retryPattern.retryIntervals.length > 0 && (
              <>
                <span className="ml-3 font-medium">Intervals:</span> 
                {multiAttemptQuery.retryPattern.retryIntervals
                  .map(interval => `${Math.round(interval)}s`)
                  .join(', ')
                }
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttemptSelector; 