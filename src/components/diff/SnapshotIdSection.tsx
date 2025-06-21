import React from 'react';
import { ViewMode } from './ViewModeToggle';
import { ProfileData } from '@/utils/jqUtils';

interface SnapshotIdSectionProps {
  leftData: ProfileData;
  rightData: ProfileData;
  viewMode: ViewMode;
}

const SnapshotIdSection: React.FC<SnapshotIdSectionProps> = ({ 
  leftData, 
  rightData, 
  viewMode 
}) => {
  const snapshotsDiffer = leftData.snapshotId && rightData.snapshotId && 
                         leftData.snapshotId !== rightData.snapshotId;

  return (
    <>
      {/* Snapshot IDs differ warning */}
      {snapshotsDiffer && (
        <div className="w-full max-w-xl mx-auto mb-4 bg-yellow-100 p-3 text-yellow-800 font-semibold rounded-lg text-center">
          Snapshot IDs differ!
        </div>
      )}
      
      {/* Snapshot ID Section */}
      {viewMode === 'split' && (
        <div className="flex flex-row gap-8 items-center">
          <div className="flex-1">
            <div className="border rounded-lg bg-white p-3">
              <span className="font-medium text-blue-800">Source Snapshot ID: </span>
              {leftData.snapshotId ? (
                <span className="text-gray-800">{leftData.snapshotId}</span>
              ) : (
                <span className="text-gray-400 italic">Not found</span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="border rounded-lg bg-white p-3">
              <span className="font-medium text-blue-800">Target Snapshot ID: </span>
              {rightData.snapshotId ? (
                <span className="text-gray-800">{rightData.snapshotId}</span>
              ) : (
                <span className="text-gray-400 italic">Not found</span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {viewMode === 'source-only' && (
        <div className="border rounded-lg bg-white p-3">
          <span className="font-medium text-blue-800">Source Snapshot ID: </span>
          {leftData.snapshotId ? (
            <span className="text-gray-800">{leftData.snapshotId}</span>
          ) : (
            <span className="text-gray-400 italic">Not found</span>
          )}
        </div>
      )}
      
      {viewMode === 'target-only' && (
        <div className="border rounded-lg bg-white p-3">
          <span className="font-medium text-blue-800">Target Snapshot ID: </span>
          {rightData.snapshotId ? (
            <span className="text-gray-800">{rightData.snapshotId}</span>
          ) : (
            <span className="text-gray-400 italic">Not found</span>
          )}
        </div>
      )}
    </>
  );
};

export default SnapshotIdSection;