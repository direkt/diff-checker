"use client";

import { useState, useEffect, useCallback } from "react";
import FileUploader from "@/components/FileUploader";
import DiffViewer from "@/components/DiffViewer";
import { extractProfileData, ProfileData } from "@/utils/jqUtils";

interface ProcessedFile {
  name: string;
  content: string;
  queryId: string;
}

interface QueryGroup {
  queryId: string;
  folderName: string;
  files: ProcessedFile[];
}

export default function Home() {
  const [leftData, setLeftData] = useState<ProfileData | null>(null);
  const [rightData, setRightData] = useState<ProfileData | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("plan");
  
  // Use a single files array for both sides
  const [allFiles, setAllFiles] = useState<ProcessedFile[]>([]);
  const [queryGroups, setQueryGroups] = useState<QueryGroup[]>([]);
  
  const [selectedLeftQueryId, setSelectedLeftQueryId] = useState<string>("");
  const [selectedRightQueryId, setSelectedRightQueryId] = useState<string>("");
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showWordDiff, setShowWordDiff] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(false); // Single state for both options sections

  // Group files by query ID whenever files change
  useEffect(() => {
    const groupFilesByQueryId = (files: ProcessedFile[]): QueryGroup[] => {
      console.log('Grouping files by queryId:', files);
      
      const queryMap: Record<string, ProcessedFile[]> = {};
      
      // Group files by queryId (which is now the folder name)
      files.forEach(file => {
        if (!queryMap[file.queryId]) {
          queryMap[file.queryId] = [];
        }
        queryMap[file.queryId].push(file);
      });
      
      // Convert map to array of QueryGroup objects
      return Object.entries(queryMap).map(([queryId, files]) => ({
        queryId,
        folderName: queryId, // Using queryId as the folderName
        files
      }));
    };
    
    const groups = groupFilesByQueryId(allFiles);
    console.log('Generated query groups:', groups);
    setQueryGroups(groups);
  }, [allFiles]);

  // Set default selections when query groups change
  useEffect(() => {
    if (queryGroups.length === 0) return;
    
    console.log('Setting default selections from query groups:', queryGroups);
    console.log('Current selections - Left:', selectedLeftQueryId, 'Right:', selectedRightQueryId);
    
    // Only set the left query ID if it's not set or if the current selection doesn't exist in the groups
    if (!selectedLeftQueryId || !queryGroups.some(g => g.queryId === selectedLeftQueryId)) {
      console.log('Setting left query ID to:', queryGroups[0].queryId);
      setSelectedLeftQueryId(queryGroups[0].queryId);
    }
    
    // Only set the right query ID if it's not set or if the current selection doesn't exist in the groups
    if (!selectedRightQueryId || !queryGroups.some(g => g.queryId === selectedRightQueryId)) {
      // If there are at least 2 query IDs, select the second one for the right side
      // Otherwise, use the same query ID for both sides
      if (queryGroups.length > 1) {
        console.log('Setting right query ID to:', queryGroups[1].queryId);
        setSelectedRightQueryId(queryGroups[1].queryId);
      } else {
        console.log('Setting right query ID to same as left:', queryGroups[0].queryId);
        setSelectedRightQueryId(queryGroups[0].queryId);
      }
    }
  }, [queryGroups, selectedLeftQueryId, selectedRightQueryId]);

  // Process file for left side when selection changes
  useEffect(() => {
    if (!selectedLeftQueryId || queryGroups.length === 0) return;
    
    console.log('Processing left side for queryId:', selectedLeftQueryId);
    
    const queryGroup = queryGroups.find(group => group.queryId === selectedLeftQueryId);
    if (queryGroup && queryGroup.files.length > 0) {
      // Find profile.json file or use the first file
      const profileFile = queryGroup.files.find(file => 
        file.name.endsWith('profile.json') || 
        file.name.toLowerCase().includes('profile')
      ) || queryGroup.files[0];
      
      console.log('Selected profile file for left side:', profileFile.name);
      processFile(profileFile.content, "left");
    }
  }, [selectedLeftQueryId, queryGroups]);

  // Process file for right side when selection changes
  useEffect(() => {
    if (!selectedRightQueryId || queryGroups.length === 0) return;
    
    console.log('Processing right side for queryId:', selectedRightQueryId);
    
    const queryGroup = queryGroups.find(group => group.queryId === selectedRightQueryId);
    if (queryGroup && queryGroup.files.length > 0) {
      // Find profile.json file or use the first file
      const profileFile = queryGroup.files.find(file => 
        file.name.endsWith('profile.json') || 
        file.name.toLowerCase().includes('profile')
      ) || queryGroup.files[0];
      
      console.log('Selected profile file for right side:', profileFile.name);
      processFile(profileFile.content, "right");
    }
  }, [selectedRightQueryId, queryGroups]);

  const processFile = useCallback(async (content: string, side: "left" | "right") => {
    setIsProcessing(true);
    try {
      const profileData = await extractProfileData(content);
      if (side === "left") {
        setLeftData(profileData);
      } else {
        setRightData(profileData);
      }
    } catch (error) {
      console.error(`Error processing ${side} file:`, error);
      alert(`Failed to process ${side} file. Please check if it's a valid profile JSON.`);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFilesProcessed = useCallback((files: ProcessedFile[]) => {
    console.log('Files processed:', files);
    
    setAllFiles(prevFiles => {
      // Merge new files with existing files
      const newFiles = [...prevFiles];
      
      // Add only files that don't already exist (based on name and queryId)
      files.forEach(file => {
        if (!newFiles.some(f => f.name === file.name && f.queryId === file.queryId)) {
          newFiles.push(file);
        }
      });
      
      console.log('Updated all files:', newFiles);
      return newFiles;
    });
  }, []);

  const handleLeftQuerySelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const queryId = e.target.value;
    console.log('Left query selected:', queryId);
    setSelectedLeftQueryId(queryId);
  }, []);

  const handleRightQuerySelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const queryId = e.target.value;
    console.log('Right query selected:', queryId);
    setSelectedRightQueryId(queryId);
  }, []);

  // Get the count of unique query IDs (folder names)
  const getFolderCount = useCallback(() => {
    return queryGroups.length;
  }, [queryGroups]);

  // Get the count of files in each folder
  const getFileCountForFolder = useCallback((queryId: string) => {
    const group = queryGroups.find(g => g.queryId === queryId);
    return group ? group.files.length : 0;
  }, [queryGroups]);

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
        {/* Single upload area at the top */}
        <div className="mb-8 max-w-3xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Query Profiles</h2>
            <p className="text-gray-600 mb-4">
              Upload folders containing query profile JSON files. 
              The folder name will be used as the query ID in the dropdown.
            </p>
            <FileUploader 
              onFilesProcessed={handleFilesProcessed} 
              side="center"
            />
            {allFiles.length > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                <p>{getFolderCount()} folders uploaded with {allFiles.length} total files</p>
              </div>
            )}
          </div>
        </div>

        {/* Selection dropdowns in a grid */}
        {queryGroups.length > 0 && (
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
                  onChange={handleLeftQuerySelect}
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
                  onChange={handleRightQuerySelect}
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
        )}

        {/* Comparison section selection */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <label htmlFor="sectionSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Select Section to Compare:
          </label>
          <select
            id="sectionSelect"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <option value="plan">Query Plan</option>
            <option value="pdsDatasetPaths">PDS Dataset Paths</option>
            <option value="vdsDatasetPaths">VDS Dataset Paths</option>
            <option value="vdsDetails">VDS Details with SQL</option>
            <option value="planOperators">Plan Operators</option>
            <option value="reflections">Reflections</option>
            <option value="dataScans">Data Scans</option>
          </select>
        </div>

        {/* Display the queries */}
        {leftData && rightData && (
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
        )}

        {/* Display non-default options (support keys) for both sides */}
        {(leftData?.nonDefaultOptions?.length ?? 0) > 0 || (rightData?.nonDefaultOptions?.length ?? 0) > 0 ? (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-blue-800">Source Non-Default Options</h3>
                <button
                  className="text-blue-600 hover:underline text-sm"
                  onClick={() => setOptionsOpen((open) => !open)}
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
                  onClick={() => setOptionsOpen((open) => !open)}
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
        ) : null}

        {/* Display reflections if selected */}
        {selectedSection === 'reflections' && leftData && rightData && (
          <div className="grid grid-cols-2 gap-8 mt-8">
            <div className="space-y-6">
              <div className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="font-medium text-blue-800 mb-3">Source Chosen Reflections</h3>
                {leftData.reflections?.chosen?.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {leftData.reflections.chosen.map((reflection, index) => (
                      <li key={index} className="text-gray-700">{reflection}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No chosen reflections</p>
                )}
                {leftData.reflections?.chosen?.some(r => r.includes('accelerationDetails') || r.includes('Default Reflections')) && (
                  <p className="text-xs text-blue-600 mt-3">Note: These reflections were extracted from encoded acceleration details</p>
                )}
              </div>
              <div className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="font-medium text-blue-800 mb-3">Source Considered Reflections</h3>
                {leftData.reflections?.considered?.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {leftData.reflections.considered.map((reflection, index) => (
                      <li key={index} className="text-gray-700">{reflection}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No considered reflections</p>
                )}
                {leftData.reflections?.considered?.some(r => r.includes('Raw Reflection') || r.includes('Error:')) && (
                  <p className="text-xs text-blue-600 mt-3">Note: These reflections were extracted from encoded acceleration details</p>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="font-medium text-blue-800 mb-3">Target Chosen Reflections</h3>
                {rightData.reflections?.chosen?.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {rightData.reflections.chosen.map((reflection, index) => (
                      <li key={index} className="text-gray-700">{reflection}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No chosen reflections</p>
                )}
                {rightData.reflections?.chosen?.some(r => r.includes('accelerationDetails') || r.includes('Default Reflections')) && (
                  <p className="text-xs text-blue-600 mt-3">Note: These reflections were extracted from encoded acceleration details</p>
                )}
              </div>
              <div className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="font-medium text-blue-800 mb-3">Target Considered Reflections</h3>
                {rightData.reflections?.considered?.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {rightData.reflections.considered.map((reflection, index) => (
                      <li key={index} className="text-gray-700">{reflection}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No considered reflections</p>
                )}
                {rightData.reflections?.considered?.some(r => r.includes('Raw Reflection') || r.includes('Error:')) && (
                  <p className="text-xs text-blue-600 mt-3">Note: These reflections were extracted from encoded acceleration details</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Toggle Word Diff Button */}
        <div className="flex justify-center mb-4">
          <button
            className={`px-4 py-2 rounded font-semibold shadow transition-colors duration-150 ${showWordDiff ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setShowWordDiff((prev) => !prev)}
          >
            {showWordDiff ? 'Hide Word Differences' : 'Show Word Differences'}
          </button>
        </div>

        {isProcessing ? (
          <div className="text-center p-8">
            <p className="text-lg">Processing files...</p>
          </div>
        ) : (
          <div className="text-base">
            <DiffViewer
              leftData={leftData}
              rightData={rightData}
              selectedSection={selectedSection}
              showWordDiff={showWordDiff}
            />
          </div>
        )}
      </div>
    </div>
  );
}
