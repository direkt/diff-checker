import React from 'react';
import { ProfileData } from '@/utils/jqUtils';

interface QueryDisplaysProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
  selectedLeftQueryId: string;
  selectedRightQueryId: string;
}

const QueryDisplays: React.FC<QueryDisplaysProps> = ({
  leftData,
  rightData,
  selectedLeftQueryId,
  selectedRightQueryId
}) => {
  if (!leftData || !rightData) {
    return null;
  }

  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h3 className="font-medium text-gray-700 mb-2">Source Query: {selectedLeftQueryId}</h3>
        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-md overflow-auto max-h-60 text-gray-800">
          {leftData.query}
        </pre>
      </div>
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h3 className="font-medium text-gray-700 mb-2">Target Query: {selectedRightQueryId}</h3>
        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded-md overflow-auto max-h-60 text-gray-800">
          {rightData.query}
        </pre>
      </div>
    </div>
  );
};

export default QueryDisplays;