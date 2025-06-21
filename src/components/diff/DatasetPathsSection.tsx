import React from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { ViewMode } from './ViewModeToggle';
import { ProfileData } from '@/utils/jqUtils';

interface DatasetPathsSectionProps {
  leftData: ProfileData;
  rightData: ProfileData;
  viewMode: ViewMode;
  showWordDiff: boolean;
  customStyles: Record<string, unknown>;
}

const DatasetPathsSection: React.FC<DatasetPathsSectionProps> = ({ 
  leftData, 
  rightData, 
  viewMode, 
  showWordDiff,
  customStyles 
}) => {
  const pdsPathsDiffer = leftData.pdsDatasetPaths.join('\n') !== rightData.pdsDatasetPaths.join('\n');
  const vdsPathsDiffer = leftData.vdsDatasetPaths.join('\n') !== rightData.vdsDatasetPaths.join('\n');

  return (
    <div className="space-y-4">
      {/* PDS Dataset Paths */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="bg-blue-100 p-3 font-medium text-blue-800">
          PDS Dataset Paths
        </div>
        <div className="p-4">
          {viewMode === 'split' && pdsPathsDiffer && (
            <div className="w-full max-w-xl mx-auto mb-4 bg-yellow-100 p-3 text-yellow-800 font-semibold rounded-lg text-center">
              PDS Dataset Paths differ!
            </div>
          )}
          
          {viewMode === 'source-only' && (
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono">
              {leftData.pdsDatasetPaths.join('\n')}
            </pre>
          )}
          
          {viewMode === 'target-only' && (
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono">
              {rightData.pdsDatasetPaths.join('\n')}
            </pre>
          )}
          
          {viewMode === 'split' && (
            <ReactDiffViewer
              oldValue={leftData.pdsDatasetPaths.join('\n')}
              newValue={rightData.pdsDatasetPaths.join('\n')}
              splitView={true}
              useDarkTheme={false}
              showDiffOnly={false}
              disableWordDiff={!showWordDiff}
              leftTitle="Source"
              rightTitle="Target"
              styles={customStyles}
            />
          )}
        </div>
      </div>

      {/* VDS Dataset Paths */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="bg-blue-100 p-3 font-medium text-blue-800">
          VDS Dataset Paths
        </div>
        <div className="p-4">
          {viewMode === 'split' && vdsPathsDiffer && (
            <div className="w-full max-w-xl mx-auto mb-4 bg-yellow-100 p-3 text-yellow-800 font-semibold rounded-lg text-center">
              VDS Dataset Paths differ!
            </div>
          )}
          
          {viewMode === 'source-only' && (
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono">
              {leftData.vdsDatasetPaths.join('\n')}
            </pre>
          )}
          
          {viewMode === 'target-only' && (
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono">
              {rightData.vdsDatasetPaths.join('\n')}
            </pre>
          )}
          
          {viewMode === 'split' && (
            <ReactDiffViewer
              oldValue={leftData.vdsDatasetPaths.join('\n')}
              newValue={rightData.vdsDatasetPaths.join('\n')}
              splitView={true}
              useDarkTheme={false}
              showDiffOnly={false}
              disableWordDiff={!showWordDiff}
              leftTitle="Source"
              rightTitle="Target"
              styles={customStyles}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DatasetPathsSection;