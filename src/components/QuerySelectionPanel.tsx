import React from 'react';
import { QueryGroup } from '@/hooks/useFileManager';

interface QuerySelectionPanelProps {
  queryGroups: QueryGroup[];
  selectedLeftQueryId: string;
  selectedRightQueryId: string;
  onLeftQuerySelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRightQuerySelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  getFileCountForFolder: (queryId: string) => number;
}

const QuerySelectionPanel: React.FC<QuerySelectionPanelProps> = ({
  queryGroups,
  selectedLeftQueryId,
  selectedRightQueryId,
  onLeftQuerySelect,
  onRightQuerySelect,
  getFileCountForFolder
}) => {
  if (queryGroups.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-blue-800 mb-3">Source Selection</h3>
        <div className="mb-4">
          <label htmlFor="leftQuerySelect" className="block text-sm font-medium text-gray-700 mb-1">
            Select Source Query ID:
          </label>
          <select
            id="leftQuerySelect"
            className="w-full p-2 border border-gray-300 rounded-md text-gray-800 bg-white"
            value={selectedLeftQueryId}
            onChange={onLeftQuerySelect}
          >
            {queryGroups.map((group) => (
              <option key={`left-${group.queryId}`} value={group.queryId} className="text-gray-800 bg-white">
                {group.folderName} ({getFileCountForFolder(group.queryId)} files)
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-blue-800 mb-3">Target Selection</h3>
        <div className="mb-4">
          <label htmlFor="rightQuerySelect" className="block text-sm font-medium text-gray-700 mb-1">
            Select Target Query ID:
          </label>
          <select
            id="rightQuerySelect"
            className="w-full p-2 border border-gray-300 rounded-md text-gray-800 bg-white"
            value={selectedRightQueryId}
            onChange={onRightQuerySelect}
          >
            {queryGroups.map((group) => (
              <option key={`right-${group.queryId}`} value={group.queryId} className="text-gray-800 bg-white">
                {group.folderName} ({getFileCountForFolder(group.queryId)} files)
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default QuerySelectionPanel;