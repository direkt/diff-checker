import fs from 'fs';
import path from 'path';
import { ProfileData } from './jqUtils';

export const loadProfileFromFile = async (filePath: string, id: string): Promise<any> => {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load profile from ${filePath}: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Try to load version from version.txt if it exists
    try {
      const dirPath = path.dirname(filePath);
      const versionFilePath = path.join(dirPath, 'version.txt');
      
      // Check if version.txt exists
      const versionResponse = await fetch(versionFilePath);
      if (versionResponse.ok) {
        const versionText = await versionResponse.text();
        // Add version to data
        data.version = versionText.trim();
      }
    } catch (error) {
      console.warn(`Failed to load version for ${filePath}:`, error);
    }
    
    // Format the profile data
    return {
      id,
      ...data
    };
  } catch (error) {
    console.error(`Error loading profile from ${filePath}:`, error);
    return null;
  }
};

export const loadVersionFromDirectory = async (dirPath: string): Promise<string | null> => {
  try {
    const versionFilePath = path.join(dirPath, 'version.txt');
    const response = await fetch(versionFilePath);
    
    if (response.ok) {
      const versionText = await response.text();
      return versionText.trim();
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to load version from ${dirPath}:`, error);
    return null;
  }
};

export const enhanceProfileWithVersion = async (profileData: ProfileData, dirPath: string): Promise<ProfileData> => {
  if (profileData.version) {
    return profileData; // Already has version
  }
  
  try {
    const version = await loadVersionFromDirectory(dirPath);
    if (version) {
      return {
        ...profileData,
        version
      };
    }
  } catch (error) {
    console.warn(`Failed to enhance profile with version from ${dirPath}:`, error);
  }
  
  return profileData;
}; 