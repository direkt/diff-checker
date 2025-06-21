import React from 'react';

export type ViewMode = 'split' | 'source-only' | 'target-only';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex justify-center mb-6 bg-white p-4 rounded-lg shadow-sm">
      <div className="flex space-x-2">
        <button
          onClick={() => onViewModeChange('source-only')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            viewMode === 'source-only'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          aria-label="Show source only"
        >
          📄 Source Only
        </button>
        <button
          onClick={() => onViewModeChange('split')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            viewMode === 'split'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          aria-label="Show split view comparison"
        >
          ⚖️ Split View
        </button>
        <button
          onClick={() => onViewModeChange('target-only')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            viewMode === 'target-only'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          aria-label="Show target only"
        >
          📄 Target Only
        </button>
      </div>
    </div>
  );
};

export default ViewModeToggle;