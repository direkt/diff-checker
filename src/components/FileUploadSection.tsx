import React from 'react';
import FileUploader from '@/components/FileUploader';

interface FileUploadSectionProps {
  onFilesProcessed: (files: any[]) => void;
  fileCount: number;
  folderCount: number;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  onFilesProcessed,
  fileCount,
  folderCount
}) => {
  return (
    <div className="mb-8 max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Query Profiles</h2>
        <p className="text-gray-600 mb-4">
          Upload folders containing query profile JSON files. 
          The folder name will be used as the query ID in the dropdown.
        </p>
        <FileUploader 
          onFilesProcessed={onFilesProcessed} 
          side="center"
        />
        {fileCount > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            <p>{folderCount} folders uploaded with {fileCount} total files</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadSection;