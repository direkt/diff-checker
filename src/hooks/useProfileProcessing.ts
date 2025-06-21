import { useState, useCallback, useEffect } from 'react';
import { ProfileData, extractProfileData } from '@/utils/jqUtils';
import { ProcessedFile, QueryGroup } from './useFileManager';
import { useError } from '@/components/ErrorToast';

export function useProfileProcessing(
  queryGroups: QueryGroup[],
  selectedLeftQueryId: string,
  selectedRightQueryId: string,
  findProfileFile: (files: ProcessedFile[]) => ProcessedFile | null
) {
  const { showError } = useError();
  const [leftData, setLeftData] = useState<ProfileData | null>(null);
  const [rightData, setRightData] = useState<ProfileData | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError(`Failed to process ${side} file: ${errorMessage}. Please check if it's a valid profile JSON.`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [showError]);

  // Process file for left side when selection changes
  useEffect(() => {
    if (!selectedLeftQueryId || queryGroups.length === 0) return;
    
    console.log('Processing left side for queryId:', selectedLeftQueryId);
    
    const queryGroup = queryGroups.find(group => group.queryId === selectedLeftQueryId);
    if (queryGroup && queryGroup.files.length > 0) {
      const profileFile = findProfileFile(queryGroup.files);
      
      if (profileFile) {
        console.log('Selected profile file for left side:', profileFile.name);
        processFile(profileFile.content, "left");
      }
    }
  }, [selectedLeftQueryId, queryGroups, findProfileFile, processFile]);

  // Process file for right side when selection changes
  useEffect(() => {
    if (!selectedRightQueryId || queryGroups.length === 0) return;
    
    console.log('Processing right side for queryId:', selectedRightQueryId);
    
    const queryGroup = queryGroups.find(group => group.queryId === selectedRightQueryId);
    if (queryGroup && queryGroup.files.length > 0) {
      const profileFile = findProfileFile(queryGroup.files);
      
      if (profileFile) {
        console.log('Selected profile file for right side:', profileFile.name);
        processFile(profileFile.content, "right");
      }
    }
  }, [selectedRightQueryId, queryGroups, findProfileFile, processFile]);

  const processProfileFile = useCallback(async (content: string, side: "left" | "right") => {
    await processFile(content, side);
  }, [processFile]);

  const clearData = useCallback(() => {
    setLeftData(null);
    setRightData(null);
  }, []);

  return {
    leftData,
    rightData,
    isProcessing,
    processProfileFile,
    clearData
  };
}