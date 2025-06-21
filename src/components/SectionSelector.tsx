import React, { useMemo, useCallback } from 'react';

interface SectionSelectorProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

const SectionSelector: React.FC<SectionSelectorProps> = ({ 
  selectedSection, 
  onSectionChange 
}) => {
  // Memoized section options for better performance
  const sectionOptions = useMemo(() => [
    { value: "plan", label: "Query Plan" },
    { value: "pdsDatasetPaths", label: "PDS Dataset Paths" },
    { value: "vdsDatasetPaths", label: "VDS Dataset Paths" },
    { value: "vdsDetails", label: "VDS Details with SQL" },
    { value: "planOperators", label: "Plan Operators" },
    { value: "reflections", label: "Reflections" },
    { value: "dataScans", label: "Data Scans" },
    { value: "performanceAnalysis", label: "Query Performance Analysis" },
    { value: "queryPhaseValidation", label: "Query Phase Validation" }
  ], []);

  // Memoized section change handler
  const handleSectionChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onSectionChange(e.target.value);
  }, [onSectionChange]);

  return (
    <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
      <label htmlFor="sectionSelect" className="block text-sm font-medium text-gray-700 mb-1">
        Select Section to Compare:
      </label>
      <select
        id="sectionSelect"
        className="w-full p-2 border border-gray-300 rounded-md"
        value={selectedSection}
        onChange={handleSectionChange}
      >
        {sectionOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SectionSelector;