import React from 'react';

interface WordDiffToggleProps {
  showWordDiff: boolean;
  onToggle: () => void;
}

const WordDiffToggle: React.FC<WordDiffToggleProps> = ({ showWordDiff, onToggle }) => {
  return (
    <div className="flex justify-center mb-4">
      <button
        className={`px-4 py-2 rounded font-semibold shadow transition-colors duration-150 ${
          showWordDiff 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        onClick={onToggle}
      >
        {showWordDiff ? 'Hide Word Differences' : 'Show Word Differences'}
      </button>
    </div>
  );
};

export default WordDiffToggle;