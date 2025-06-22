"use client";

import { useState, useCallback } from "react";
import DiffViewer from "@/components/DiffViewer";
import ErrorBoundary from "@/components/ErrorBoundary";
import SectionSelector from "@/components/SectionSelector";
import QueryDisplays from "@/components/QueryDisplays";
import NonDefaultOptions from "@/components/NonDefaultOptions";
import QuerySelectionPanel from "@/components/QuerySelectionPanel";
import ReflectionDisplay from "@/components/ReflectionDisplay";
import FileUploadSection from "@/components/FileUploadSection";
import QueryPhaseSection from "@/components/QueryPhaseSection";
import WordDiffToggle from "@/components/WordDiffToggle";
import VisualizationContainer from "@/components/visualizations/VisualizationContainer";
import { useFileManager } from "@/hooks/useFileManager";
import { useQuerySelection } from "@/hooks/useQuerySelection";
import { useProfileProcessing } from "@/hooks/useProfileProcessing";

export default function Home() {
  // Custom hooks for state management
  const fileManager = useFileManager();
  const { selectedLeftQueryId, selectedRightQueryId, handleLeftQuerySelect, handleRightQuerySelect } = 
    useQuerySelection(fileManager.queryGroups);
  const { leftData, rightData, isProcessing } = useProfileProcessing(
    fileManager.queryGroups,
    selectedLeftQueryId,
    selectedRightQueryId,
    fileManager.findProfileFile
  );
  
  // Local UI state
  const [selectedSection, setSelectedSection] = useState<string>("plan");
  const [showWordDiff, setShowWordDiff] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(true);

  // UI handlers
  const handleSectionChange = useCallback((section: string) => {
    console.log('Main page: section changing from', selectedSection, 'to', section);
    setSelectedSection(section);
  }, [selectedSection]);

  const toggleOptionsOpen = useCallback(() => {
    setOptionsOpen(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50">
      <header className="mb-8 relative">
        <h1 className="text-3xl font-bold text-center text-blue-800">Query Profile Diff Checker</h1>
        <p className="text-center text-gray-600 mt-2">
          Upload query profile JSON files to compare and analyze differences
        </p>
      </header>

      {/* Main content area */}
      <div className="flex flex-col space-y-8">
        {/* File upload section */}
        <FileUploadSection
          onFilesProcessed={fileManager.handleFilesProcessed}
          fileCount={fileManager.allFiles.length}
          folderCount={fileManager.folderCount}
        />

        {/* Selection dropdowns */}
        <QuerySelectionPanel
          queryGroups={fileManager.queryGroups}
          selectedLeftQueryId={selectedLeftQueryId}
          selectedRightQueryId={selectedRightQueryId}
          onLeftQuerySelect={handleLeftQuerySelect}
          onRightQuerySelect={handleRightQuerySelect}
          getFileCountForFolder={fileManager.getFileCountForFolder}
        />

        {/* Comparison section selection */}
        <SectionSelector
          selectedSection={selectedSection}
          onSectionChange={handleSectionChange}
        />

        {/* Display the queries */}
        <QueryDisplays
          leftData={leftData}
          rightData={rightData}
          selectedLeftQueryId={selectedLeftQueryId}
          selectedRightQueryId={selectedRightQueryId}
        />

        {/* Display non-default options */}
        <NonDefaultOptions
          leftData={leftData}
          rightData={rightData}
          optionsOpen={optionsOpen}
          onToggleOptions={toggleOptionsOpen}
        />

        {/* Display reflections if selected */}
        {selectedSection === 'reflections' && leftData && rightData && (
          <ReflectionDisplay leftData={leftData} rightData={rightData} />
        )}

        {/* Display query phase validation if selected */}
        {selectedSection === 'queryPhaseValidation' && (
          <QueryPhaseSection leftData={leftData} rightData={rightData} />
        )}

        {/* Display advanced visualizations if selected */}
        {selectedSection === 'visualizations' && (
          <div>
            <div className="bg-purple-100 p-4 rounded mb-4">
              <p className="text-purple-800 font-bold">📊 Visualization Section Active!</p>
              <p className="text-purple-700">Selected Section: {selectedSection}</p>
              <p className="text-purple-700">Data Available: Left={!!leftData}, Right={!!rightData}</p>
            </div>
            <VisualizationContainer 
              leftData={leftData} 
              rightData={rightData} 
              viewMode="split"
            />
          </div>
        )}

        {/* Toggle Word Diff Button */}
        {selectedSection !== 'visualizations' && (
          <WordDiffToggle 
            showWordDiff={showWordDiff}
            onToggle={() => setShowWordDiff((prev) => !prev)}
          />
        )}

        {isProcessing ? (
          <div className="text-center p-8">
            <p className="text-lg">Processing files...</p>
          </div>
        ) : selectedSection !== 'visualizations' ? (
          <ErrorBoundary>
            <div className="text-base">
              <DiffViewer
                leftData={leftData}
                rightData={rightData}
                selectedSection={selectedSection}
                showWordDiff={showWordDiff}
              />
            </div>
          </ErrorBoundary>
        ) : null}
      </div>
    </div>
  );
}
