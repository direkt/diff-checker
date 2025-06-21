import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { useError } from './ErrorToast';

interface FileUploaderProps {
  onFilesProcessed: (files: { name: string; content: string; queryId: string }[]) => void;
  side: 'left' | 'right' | 'center';
}

// Add TypeScript interface for webkitdirectory
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesProcessed, side }) => {
  const { showError } = useError();
  const [isLoading, setIsLoading] = useState(false);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const readFileAsText = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }, []);

  // Find the deepest folder containing JSON files
  const findDeepestJsonFolder = useCallback((files: File[]): Map<string, File[]> => {
    // Group files by their parent folder path
    const folderMap = new Map<string, File[]>();
    
    // First, collect all folder paths
    files.forEach(file => {
      if (file.webkitRelativePath && file.name.endsWith('.json')) {
        // Get all parent folder paths
        const pathParts = file.webkitRelativePath.split('/');
        
        // Skip the last part which is the filename
        if (pathParts.length > 1) {
          // For each file, add it to all its parent folders
          for (let i = 1; i < pathParts.length; i++) {
            // Create path up to this level
            const folderPath = pathParts.slice(0, i).join('/');
            
            if (!folderMap.has(folderPath)) {
              folderMap.set(folderPath, []);
            }
            
            folderMap.get(folderPath)?.push(file);
          }
        }
      }
    });
    
    console.log('All folder paths with JSON files:', Array.from(folderMap.keys()));
    
    // Find leaf folders (folders that contain JSON files directly)
    const leafFolders = new Map<string, File[]>();
    
    files.forEach(file => {
      if (file.webkitRelativePath && file.name.endsWith('.json')) {
        const pathParts = file.webkitRelativePath.split('/');
        // Get the direct parent folder path (excluding the filename)
        if (pathParts.length > 1) {
          const directParentPath = pathParts.slice(0, pathParts.length - 1).join('/');
          
          if (!leafFolders.has(directParentPath)) {
            leafFolders.set(directParentPath, []);
          }
          
          leafFolders.get(directParentPath)?.push(file);
        }
      }
    });
    
    console.log('Leaf folders with JSON files:', Array.from(leafFolders.keys()));
    
    return leafFolders;
  }, []);

  // Extract folder name from a file path
  const extractFolderName = useCallback((file: File): string => {
    // If the file has a webkitRelativePath (from folder upload), use the appropriate folder
    if (file.webkitRelativePath) {
      const pathParts = file.webkitRelativePath.split('/');
      
      // If we have a nested structure, use the deepest folder containing JSON files
      if (pathParts.length > 2) {
        // Get the direct parent folder (the folder containing the JSON file)
        return pathParts[pathParts.length - 2];
      } else if (pathParts.length > 1) {
        // If it's just one level deep, use the first directory
        return pathParts[0];
      }
    }
    
    // For individual files, use the filename without extension
    return file.name.replace(/\.[^/.]+$/, '');
  }, []);

  const processFiles = useCallback(async (acceptedFiles: File[]) => {
    setIsLoading(true);
    const processedFiles: { name: string; content: string; queryId: string }[] = [];
    
    try {
      console.log('Processing files:', acceptedFiles);
      
      if (!acceptedFiles || acceptedFiles.length === 0) {
        console.error('No files were provided for processing');
        showError('No files were selected. Please try again.', 'warning');
        setIsLoading(false);
        return;
      }
      
      // Check if we have folder uploads
      const hasFolderUploads = acceptedFiles.some(file => file.webkitRelativePath);
      
      if (hasFolderUploads) {
        // Find the deepest folders containing JSON files
        const leafFolders = findDeepestJsonFolder(acceptedFiles);
        
        // Process each leaf folder
        for (const [folderPath, files] of leafFolders.entries()) {
          // Extract the folder name from the path (last part of the path)
          const pathParts = folderPath.split('/');
          const folderName = pathParts[pathParts.length - 1];
          
          console.log(`Processing ${files.length} files in folder: ${folderName} (path: ${folderPath})`);
          
          for (const file of files) {
            try {
              const content = await readFileAsText(file);
              processedFiles.push({
                name: file.webkitRelativePath || file.name,
                content,
                queryId: folderName
              });
              console.log(`Added file ${file.name} to folder ${folderName}`);
            } catch (error) {
              console.error(`Error reading file ${file.name}:`, error);
            }
          }
        }
      } else {
        // Handle individual files and ZIP files
        const folderFiles = new Map<string, File[]>();
        
        // Group files by folder
        for (const file of acceptedFiles) {
          try {
            if (file.name.endsWith('.json')) {
              const folderName = extractFolderName(file);
              
              if (!folderFiles.has(folderName)) {
                folderFiles.set(folderName, []);
              }
              
              folderFiles.get(folderName)?.push(file);
              console.log(`Added file ${file.name} to folder ${folderName}`);
            } else if (file.name.endsWith('.zip')) {
              // Process ZIP file separately
              await processZipFile(file, processedFiles);
            } else {
              console.warn(`Skipping file with unsupported format: ${file.name}`);
            }
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
          }
        }
        
        console.log('Folders detected:', Array.from(folderFiles.keys()));
        
        // Process each folder's files
        for (const [folderName, files] of folderFiles.entries()) {
          console.log(`Processing ${files.length} files in folder: ${folderName}`);
          
          for (const file of files) {
            try {
              const content = await readFileAsText(file);
              processedFiles.push({
                name: file.webkitRelativePath || file.name,
                content,
                queryId: folderName
              });
            } catch (error) {
              console.error(`Error reading file ${file.name}:`, error);
            }
          }
        }
      }
      
      console.log('Final processed files:', processedFiles.map(f => ({ name: f.name, queryId: f.queryId })));
      
      if (processedFiles.length > 0) {
        onFilesProcessed(processedFiles);
      } else {
        showError('No valid JSON files were found. Please check your files and try again.', 'error');
      }
    } catch (error) {
      console.error('Error processing files:', error);
      showError('Error processing files. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readFileAsText, extractFolderName, findDeepestJsonFolder, onFilesProcessed]);

  // Process a ZIP file
  const processZipFile = useCallback(async (zipFile: File, processedFiles: { name: string; content: string; queryId: string }[]) => {
    console.log('Processing ZIP file:', zipFile.name);
    
    try {
      const zip = new JSZip();
      const zipContents = await zip.loadAsync(zipFile);
      
      // Group files by folder within the zip
      const zipFolders = new Map<string, { filename: string, fileRef: JSZip.JSZipObject }[]>();
      
      // Find the deepest folders containing JSON files
      const folderPaths = new Set<string>();
      const folderFiles = new Map<string, { filename: string, fileRef: JSZip.JSZipObject }[]>();
      
      Object.keys(zipContents.files).forEach(filename => {
        if (filename.endsWith('.json') && !zipContents.files[filename].dir) {
          const pathParts = filename.split('/');
          
          // Skip files at the root level
          if (pathParts.length > 1) {
            // Get all parent folder paths
            for (let i = 1; i < pathParts.length; i++) {
              const folderPath = pathParts.slice(0, i).join('/');
              folderPaths.add(folderPath);
            }
            
            // Get the direct parent folder
            const directParentPath = pathParts.slice(0, pathParts.length - 1).join('/');
            
            if (!folderFiles.has(directParentPath)) {
              folderFiles.set(directParentPath, []);
            }
            
            folderFiles.get(directParentPath)?.push({
              filename,
              fileRef: zipContents.files[filename]
            });
          } else {
            // Handle files at the root level
            const folderName = filename.replace(/\.[^/.]+$/, '');
            
            if (!zipFolders.has(folderName)) {
              zipFolders.set(folderName, []);
            }
            
            zipFolders.get(folderName)?.push({
              filename,
              fileRef: zipContents.files[filename]
            });
          }
        }
      });
      
      console.log('ZIP folders detected:', Array.from(zipFolders.keys()));
      console.log('ZIP nested folders detected:', Array.from(folderFiles.keys()));
      
      // Process each folder in the zip
      for (const [folderPath, files] of folderFiles.entries()) {
        // Extract the folder name from the path (last part of the path)
        const pathParts = folderPath.split('/');
        const folderName = pathParts[pathParts.length - 1];
        
        console.log(`Processing ${files.length} files in ZIP folder: ${folderName} (path: ${folderPath})`);
        
        for (const { filename, fileRef } of files) {
          try {
            const content = await fileRef.async('text');
            processedFiles.push({ 
              name: filename, 
              content,
              queryId: folderName
            });
          } catch (error) {
            console.error(`Error reading ZIP file entry ${filename}:`, error);
          }
        }
      }
      
      // Process root level files
      for (const [folderName, files] of zipFolders.entries()) {
        console.log(`Processing ${files.length} files in ZIP root folder: ${folderName}`);
        
        for (const { filename, fileRef } of files) {
          try {
            const content = await fileRef.async('text');
            processedFiles.push({ 
              name: filename, 
              content,
              queryId: folderName
            });
          } catch (error) {
            console.error(`Error reading ZIP file entry ${filename}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error processing ZIP file:', error);
      showError('Error processing ZIP file. Please check if it\'s a valid ZIP archive.', 'error');
    }
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      try {
        console.log('Files dropped:', acceptedFiles);
        if (acceptedFiles && acceptedFiles.length > 0) {
          await processFiles(acceptedFiles);
        } else {
          console.warn('No files were dropped or accepted');
          showError('No valid files were detected. Please try again with JSON or ZIP files.', 'warning');
        }
      } catch (error) {
        console.error('Error handling dropped files:', error);
        showError('There was an error processing the dropped files. Please try again.', 'error');
      }
    },
    [processFiles]
  );

  const { getRootProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB max file size
    onDropRejected: (fileRejections) => {
      console.error('Files rejected:', fileRejections);
      
      // Check for specific rejection reasons
      if (fileRejections.some(f => f.errors.some(e => e.code === 'file-too-large'))) {
        showError('Some files were too large. Maximum file size is 50MB.', 'warning');
      } else if (fileRejections.some(f => f.errors.some(e => e.code === 'file-invalid-type'))) {
        showError('Some files had invalid types. Only JSON and ZIP files are accepted.', 'warning');
      } else {
        showError('Some files were rejected. Please check file types and sizes.', 'warning');
      }
    },
    onError: (error) => {
      console.error('Dropzone error:', error);
      showError('There was an error with the file upload. Please try again.', 'error');
    }
  });

  const handleFolderUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (files && files.length > 0) {
        console.log('Folder upload files:', Array.from(files));
        await processFiles(Array.from(files));
      } else {
        console.warn('No files selected in folder upload');
        showError('No files were found in the selected folder. Please try again.', 'warning');
      }
    } catch (error) {
      console.error('Error handling folder upload:', error);
      showError('There was an error processing the folder. Please try again.', 'error');
    }
  }, [processFiles]);

  // Get the appropriate label text based on the side
  const getDropzoneText = () => {
    if (side === 'left') return 'Drag & drop JSON files or ZIP archives here for Source';
    if (side === 'right') return 'Drag & drop JSON files or ZIP archives here for Target';
    return '';
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        <p className="text-gray-700 mb-2">
          {isDragActive
            ? 'Drop the files here...'
            : getDropzoneText()}
        </p>
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            folderInputRef.current?.click();
          }}
        >
          Browse Files
        </button>
      </div>

      <div className="mt-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Or select a folder:
        </label>
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory="true"
          directory=""
          multiple
          onChange={handleFolderUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          style={{ display: 'inline' }}
        />
      </div>

      {isLoading && (
        <div className="mt-4 text-center">
          <p className="text-gray-600">Processing files...</p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
