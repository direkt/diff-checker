import React from 'react';
import QueryPhaseValidation from '@/components/QueryPhaseValidation';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ProfileData } from '@/utils/jqUtils';

interface QueryPhaseSectionProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
}

const QueryPhaseSection: React.FC<QueryPhaseSectionProps> = ({ leftData, rightData }) => {
  if (!leftData || !rightData) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {leftData.queryPhaseValidation && (
          <QueryPhaseValidation 
            validation={leftData.queryPhaseValidation} 
            title="Source"
          />
        )}
        {rightData.queryPhaseValidation && (
          <QueryPhaseValidation 
            validation={rightData.queryPhaseValidation} 
            title="Target"
          />
        )}
        {(!leftData.queryPhaseValidation || !rightData.queryPhaseValidation) && (
          <div className="col-span-2 text-center p-8 bg-yellow-50 rounded-lg">
            <p className="text-yellow-800">
              Query phase validation data is not available for one or both profiles.
              This may indicate an issue with the profile data or the validation process.
            </p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default QueryPhaseSection;