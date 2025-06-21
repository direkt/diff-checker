import { useState, useCallback, useEffect } from 'react';
import { QueryGroup } from './useFileManager';

export function useQuerySelection(queryGroups: QueryGroup[]) {
  const [selectedLeftQueryId, setSelectedLeftQueryId] = useState<string>("");
  const [selectedRightQueryId, setSelectedRightQueryId] = useState<string>("");

  // Set default selections when query groups change
  useEffect(() => {
    if (queryGroups.length === 0) return;
    
    console.log('Setting default selections from query groups:', queryGroups);
    
    // Check if current selections are valid, if not, set defaults
    const leftQueryExists = queryGroups.some(g => g.queryId === selectedLeftQueryId);
    const rightQueryExists = queryGroups.some(g => g.queryId === selectedRightQueryId);
    
    // Only update if current selections are invalid or empty
    if (!selectedLeftQueryId || !leftQueryExists) {
      console.log('Setting left query ID to:', queryGroups[0].queryId);
      setSelectedLeftQueryId(queryGroups[0].queryId);
    }
    
    if (!selectedRightQueryId || !rightQueryExists) {
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
  }, [queryGroups]); // Remove selectedLeftQueryId and selectedRightQueryId to prevent infinite loop

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

  const setLeftQueryId = useCallback((queryId: string) => {
    setSelectedLeftQueryId(queryId);
  }, []);

  const setRightQueryId = useCallback((queryId: string) => {
    setSelectedRightQueryId(queryId);
  }, []);

  return {
    selectedLeftQueryId,
    selectedRightQueryId,
    handleLeftQuerySelect,
    handleRightQuerySelect,
    setLeftQueryId,
    setRightQueryId
  };
}