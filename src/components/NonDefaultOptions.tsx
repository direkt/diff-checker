import React, { useCallback } from 'react';
import { ProfileData } from '@/utils/jqUtils';

interface NonDefaultOptionsProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
  optionsOpen: boolean;
  onToggleOptions: () => void;
}

const NonDefaultOptions: React.FC<NonDefaultOptionsProps> = ({
  leftData,
  rightData,
  optionsOpen,
  onToggleOptions
}) => {
  // Only render if either side has non-default options
  const hasOptions = (leftData?.nonDefaultOptions?.length ?? 0) > 0 || 
                    (rightData?.nonDefaultOptions?.length ?? 0) > 0;

  if (!hasOptions) {
    return null;
  }

  return (
    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-blue-800">Source Non-Default Options</h3>
          <button
            className="text-blue-600 hover:underline text-sm"
            onClick={onToggleOptions}
            aria-expanded={optionsOpen}
            aria-controls="left-non-default-options"
          >
            {optionsOpen ? 'Hide' : 'Show'}
          </button>
        </div>
        {optionsOpen && (
          (leftData?.nonDefaultOptions?.length ?? 0) > 0 ? (
            <div id="left-non-default-options">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left font-semibold text-gray-700 pr-4">Name</th>
                    <th className="text-left font-semibold text-gray-700">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {leftData?.nonDefaultOptions?.map((opt, idx) => (
                    <tr key={idx}>
                      <td className="pr-4 text-gray-800">{opt.name}</td>
                      <td className="text-gray-800">{String(opt.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No non-default options found</p>
          )
        )}
      </div>
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-blue-800">Target Non-Default Options</h3>
          <button
            className="text-blue-600 hover:underline text-sm"
            onClick={onToggleOptions}
            aria-expanded={optionsOpen}
            aria-controls="right-non-default-options"
          >
            {optionsOpen ? 'Hide' : 'Show'}
          </button>
        </div>
        {optionsOpen && (
          (rightData?.nonDefaultOptions?.length ?? 0) > 0 ? (
            <div id="right-non-default-options">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left font-semibold text-gray-700 pr-4">Name</th>
                    <th className="text-left font-semibold text-gray-700">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rightData?.nonDefaultOptions?.map((opt, idx) => (
                    <tr key={idx}>
                      <td className="pr-4 text-gray-800">{opt.name}</td>
                      <td className="text-gray-800">{String(opt.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">No non-default options found</p>
          )
        )}
      </div>
    </div>
  );
};

export default NonDefaultOptions;