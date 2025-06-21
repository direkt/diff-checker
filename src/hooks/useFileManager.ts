import { useState, useCallback, useMemo } from 'react';

export interface ProcessedFile {
  name: string;
  content: string;
  queryId: string;
}

export interface QueryGroup {
  queryId: string;
  folderName: string;
  files: ProcessedFile[];
}

export function useFileManager() {
  const [allFiles, setAllFiles] = useState<ProcessedFile[]>([]);

  // Group files by query ID using useMemo for better performance
  const queryGroups = useMemo((): QueryGroup[] => {
    if (allFiles.length === 0) return [];
    
    console.log('Grouping files by queryId:', allFiles);
    
    const queryMap: Record<string, ProcessedFile[]> = {};
    
    // Group files by queryId (which is now the folder name)
    allFiles.forEach(file => {
      if (!queryMap[file.queryId]) {
        queryMap[file.queryId] = [];
      }
      queryMap[file.queryId].push(file);
    });
    
    // Convert map to array of QueryGroup objects
    const groups = Object.entries(queryMap).map(([queryId, files]) => ({
      queryId,
      folderName: queryId, // Using queryId as the folderName
      files
    }));
    
    console.log('Generated query groups:', groups);
    return groups;
  }, [allFiles]);

  // Create a map for efficient file count lookup
  const fileCountMap = useMemo(() => {
    const map = new Map<string, number>();
    queryGroups.forEach(group => {
      map.set(group.queryId, group.files.length);
    });
    return map;
  }, [queryGroups]);

  // Get the count of unique query IDs (folder names) - memoized
  const folderCount = useMemo(() => queryGroups.length, [queryGroups]);

  // Get the count of files in each folder - optimized with map lookup
  const getFileCountForFolder = useCallback((queryId: string) => {
    return fileCountMap.get(queryId) || 0;
  }, [fileCountMap]);

  // Memoized function to find profile file
  const findProfileFile = useCallback((files: ProcessedFile[]): ProcessedFile | null => {
    if (files.length === 0) return null;
    return files.find(file => 
      file.name.endsWith('profile.json') || 
      file.name.toLowerCase().includes('profile')
    ) || files[0];
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

  const addFiles = useCallback((files: ProcessedFile[]) => {
    handleFilesProcessed(files);
  }, [handleFilesProcessed]);

  const clearFiles = useCallback(() => {
    setAllFiles([]);
  }, []);

  return {
    allFiles,
    queryGroups,
    folderCount,
    getFileCountForFolder,
    findProfileFile,
    handleFilesProcessed,
    addFiles,
    clearFiles
  };
}