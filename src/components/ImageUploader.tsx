
import React, { useState, useEffect, useCallback } from 'react';
import { resizeImage } from '../utils/image';
import { generateUUID } from '../utils/uuid';

export interface StagedFile {
  id: string;
  file: File;
  preview: string;
}

interface ImageUploaderProps {
  onFilesChange: (files: File[]) => void;
  isSubmitting: boolean;
  maxImages?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFilesChange, isSubmitting, maxImages = 5 }) => {
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [globalError, setGlobalError] = useState<string>('');
  
  useEffect(() => {
    onFilesChange(stagedFiles.map(f => f.file));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagedFiles]);
  
  useEffect(() => {
    return () => {
        stagedFiles.forEach(f => URL.revokeObjectURL(f.preview));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalError('');
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;

    if (stagedFiles.length + files.length > maxImages) {
      setGlobalError(`You can only upload a maximum of ${maxImages} photos.`);
      return;
    }
    
    const newFileEntries: { id: string, file: File }[] = files.map(file => ({
        id: generateUUID(),
        file
    }));

    const placeholderFiles: StagedFile[] = newFileEntries.map(entry => ({
        id: entry.id,
        file: entry.file,
        preview: URL.createObjectURL(entry.file)
    }));

    setStagedFiles(prev => [...prev, ...placeholderFiles]);
    setProcessingIds(prev => new Set([...prev, ...newFileEntries.map(f => f.id)]));

    newFileEntries.forEach(async (entry) => {
        try {
            const resizedFile = await resizeImage(entry.file, 1920);
            setStagedFiles(currentFiles => {
                const oldFile = currentFiles.find(f => f.id === entry.id);
                if (oldFile) {
                    URL.revokeObjectURL(oldFile.preview);
                }
                return currentFiles.map(sf => sf.id === entry.id ? { ...sf, file: resizedFile, preview: URL.createObjectURL(resizedFile) } : sf);
            });
        } catch (err) {
            console.error('Failed to resize image:', entry.file.name, err);
            setStagedFiles(current => current.filter(sf => sf.id !== entry.id));
            setGlobalError(prev => prev ? `${prev}, ${entry.file.name}` : `Could not process: ${entry.file.name}`);
        } finally {
            setProcessingIds(currentIds => {
                const newIds = new Set(currentIds);
                newIds.delete(entry.id);
                return newIds;
            });
        }
    });

    event.target.value = '';
  }, [stagedFiles.length, maxImages]);

  const removeImage = (idToRemove: string) => {
    setStagedFiles(currentFiles => {
        const fileToRemove = currentFiles.find(f => f.id === idToRemove);
        if (fileToRemove) {
            URL.revokeObjectURL(fileToRemove.preview);
        }
        return currentFiles.filter(f => f.id !== idToRemove);
    });
  };

  const getLabelText = () => {
    if (processingIds.size > 0) return 'Processing images...';
    if (isSubmitting) return 'Submitting...';
    return `Upload up to ${maxImages} photos`;
  }

  const isDisabled = isSubmitting || processingIds.size > 0 || stagedFiles.length >= maxImages;

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-600 font-serif">
        Inspirational Images (up to {maxImages})
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex justify-center text-sm text-slate-600">
            <label htmlFor="file-upload" className={`relative cursor-pointer bg-white rounded-md font-medium text-teal-600 hover:text-teal-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-teal-500 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span>{getLabelText()}</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} disabled={isDisabled} />
            </label>
          </div>
          <p className="text-xs text-slate-500">Images will be resized & uploaded upon submission.</p>
        </div>
      </div>
      {globalError && <p className="text-sm text-red-500">{globalError}</p>}
      {stagedFiles.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-4">
          {stagedFiles.map((stagedFile) => (
            <div key={stagedFile.id} className="relative group aspect-square">
              <img src={stagedFile.preview} alt={`Preview of staged file`} className="h-full w-full object-cover rounded-md shadow-sm" />
              {processingIds.has(stagedFile.id) && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-md">
                  <div className="w-8 h-8 border-4 border-dashed border-white rounded-full animate-spin"></div>
                </div>
              )}
              <button onClick={() => removeImage(stagedFile.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" aria-label="Remove image" disabled={isSubmitting}>
                &#x2715;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
