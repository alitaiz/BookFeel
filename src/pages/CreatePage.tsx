import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../App';
import { LoadingSpinner, Toast, QuillIcon } from '../components/ui';
import { EntryUpdatePayload } from '../types';
import { API_BASE_URL } from '../config';
import { resizeImage } from '../utils/image';

const CreatePage = () => {
  const { slug: editSlug } = useParams<{ slug: string }>();
  const isEditMode = !!editSlug;

  const { addEntry, getEntryBySlug, updateEntry, getCreatedEntries } = useAppContext();
  const navigate = useNavigate();

  const [bookTitle, setBookTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [reflection, setReflection] = useState('');
  
  const [bookCoverFile, setBookCoverFile] = useState<File | null>(null);
  const [bookCoverPreview, setBookCoverPreview] = useState<string | null>(null);
  const [existingBookCover, setExistingBookCover] = useState<string | null>(null);
  const [isProcessingCover, setIsProcessingCover] = useState(false);
  
  const [editKey, setEditKey] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState('');

  useEffect(() => {
    if (isEditMode && editSlug) {
      setIsLoading(true);
      const loadEntryForEdit = async () => {
        // We check ownership on the client side for quick feedback.
        // The backend will perform the definitive check using the editKey.
        const created = getCreatedEntries();
        const ownerInfo = created.find(m => m.slug === editSlug);

        if (ownerInfo) {
          const entry = await getEntryBySlug(editSlug);
          if (entry) {
            setBookTitle(entry.bookTitle);
            setTagline(entry.tagline);
            setReflection(entry.reflection);
            setEditKey(ownerInfo.editKey);
            const currentCover = entry.bookCover || null;
            setExistingBookCover(currentCover);
            setBookCoverPreview(currentCover);
          } else {
             setError("This entry could not be found.");
             setTimeout(() => navigate('/list'), 2000);
          }
        } else {
          setError("You don't have permission to edit this entry.");
          setTimeout(() => navigate('/list'), 2000);
        }
        setIsLoading(false);
      };
      loadEntryForEdit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editSlug, navigate]);
  
  // Effect to handle cleanup of blob URLs to prevent memory leaks.
  useEffect(() => {
    let currentPreview = bookCoverPreview;
    return () => {
      if (currentPreview && currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
      }
    };
  }, [bookCoverPreview]);


  const uploadFiles = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    
    const uploadPromises = files.map(async (file) => {
        const presignResponse = await fetch(`${API_BASE_URL}/api/upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });

        if (!presignResponse.ok) {
            const errorData = await presignResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to get upload URL for ${file.name}`);
        }
        const { uploadUrl, publicUrl } = await presignResponse.json();

        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed for ${file.name}.`);
        }

        return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleBookCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingCover(true);
    setError('');

    try {
      const resizedFile = await resizeImage(file, 512);
      setBookCoverFile(resizedFile);
      setBookCoverPreview(URL.createObjectURL(resizedFile));

    } catch (err) {
      console.error("Failed to resize book cover:", err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Could not process cover image: ${message}`);
    } finally {
      setIsProcessingCover(false);
      e.target.value = '';
    }
  };

  const handleRemoveBookCover = () => {
    setBookCoverFile(null);
    setBookCoverPreview(null);
  };

  const handleRewrite = async () => {
    if (!reflection.trim()) {
        setRewriteError('Please write a reflection first before using AI assist.');
        return;
    }
    setIsRewriting(true);
    setRewriteError('');
    setError('');

    try {
        const response = await fetch(`/api/rewrite-reflection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: reflection }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'The AI assistant failed to respond. Please try again later.');
        }

        const { rewrittenText } = await response.json();
        setReflection(rewrittenText);

    } catch (err) {
        console.error("AI rewrite failed:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setRewriteError(errorMessage);
    } finally {
        setIsRewriting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!bookTitle.trim()) {
      setError("Book Title is required.");
      return;
    }

    setIsLoading(true);

    try {
      if (isEditMode) {
        // --- EDIT MODE ---
        if (!editSlug || !editKey) {
          setError('Could not update entry. Key information is missing.');
          setIsLoading(false);
          return;
        }

        let finalCoverUrl: string | null | undefined = undefined; // 'undefined' means no change
        
        if (bookCoverFile) { // A new file was selected and processed
            const [uploadedUrl] = await uploadFiles([bookCoverFile]);
            finalCoverUrl = uploadedUrl;
        } else if (existingBookCover && !bookCoverPreview) { // An existing cover was present, but now there's no preview (it was removed).
            finalCoverUrl = null; // 'null' means remove
        }

        const updatedData: EntryUpdatePayload = {
          bookTitle,
          tagline,
          reflection,
          bookCover: finalCoverUrl,
        };
        const result = await updateEntry(editSlug, editKey, updatedData);
        if (result.success) {
          setShowToast(true);
          setTimeout(() => navigate(`/memory/${editSlug}`), 2000);
        } else {
          setError(result.error || 'An unknown error occurred during update.');
          setIsLoading(false);
        }
      } else {
        // --- CREATE MODE ---
        let uploadedCoverUrl: string | null = null;
        if (bookCoverFile) {
            [uploadedCoverUrl] = await uploadFiles([bookCoverFile]);
        }
        
        const result = await addEntry({
          bookTitle,
          tagline,
          reflection,
          bookCover: uploadedCoverUrl,
        });

        if (!result.success || !result.slug) {
          setError(result.error || 'Failed to create entry. The code might be taken.');
          setIsLoading(false);
          return;
        }

        setShowToast(true);
        setTimeout(() => navigate(`/memory/${result.slug}`), 2000);
      }
    } catch (uploadError) {
      console.error("Upload or submission process failed:", uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "A critical error occurred during file upload or submission.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream pt-24 pb-12">
      <Toast message={isEditMode ? 'Entry updated!' : `${bookTitle} reflection is saved!`} show={showToast} onDismiss={() => setShowToast(false)} />
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold font-serif text-center text-ink">{isEditMode ? 'Edit Entry' : 'Create a New Entry'}</h1>
          <p className="text-center text-slate-600 mt-2">{isEditMode ? 'Update the details for this reflection.' : 'Fill in the details for your new reflection.'}</p>

          {isLoading && !showToast ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label htmlFor="bookTitle" className="block text-sm font-medium text-slate-600 font-serif">Book Title *</label>
                <input type="text" id="bookTitle" value={bookTitle} onChange={e => setBookTitle(e.target.value)} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 font-serif">Book Cover (Optional)</label>
                <div className="mt-2 flex items-center gap-4">
                    <span className="relative inline-block h-20 w-20 rounded-full overflow-hidden bg-slate-100 ring-2 ring-white">
                        {bookCoverPreview ? (
                            <img src={bookCoverPreview} alt="Book cover preview" className="h-full w-full object-cover" />
                        ) : (
                            <svg className="h-full w-full text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 20.993V24H0v-2.997A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        )}
                         {isProcessingCover && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <div className="w-6 h-6 border-4 border-dashed border-white rounded-full animate-spin"></div>
                            </div>
                        )}
                    </span>
                    <input type="file" id="cover-upload" accept="image/*" onChange={handleBookCoverChange} className="hidden" disabled={isProcessingCover || isLoading} />
                    <label htmlFor="cover-upload" className={`cursor-pointer rounded-md bg-white py-2 px-3 text-sm font-semibold text-ink shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 ${isProcessingCover || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isProcessingCover ? 'Processing...' : 'Change'}
                    </label>
                    {bookCoverPreview && !isProcessingCover && (
                        <button type="button" onClick={handleRemoveBookCover} className="text-sm font-semibold text-red-600 hover:text-red-800" disabled={isLoading}>
                            Remove
                        </button>
                    )}
                </div>
              </div>
              
              <div>
                <label htmlFor="tagline" className="block text-sm font-medium text-slate-600 font-serif">One-line Summary (e.g., "A mind-bending sci-fi adventure")</label>
                <input type="text" id="tagline" value={tagline} onChange={e => setTagline(e.target.value)} className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <label htmlFor="reflection" className="block text-sm font-medium text-slate-600 font-serif">My Reflection & Thoughts</label>
                  <button 
                    type="button" 
                    onClick={handleRewrite}
                    disabled={isRewriting || !reflection.trim()}
                    className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium px-2 py-1 rounded-md hover:bg-teal-50"
                    aria-label="Rewrite with AI"
                  >
                    <QuillIcon className={`w-4 h-4 ${isRewriting ? 'animate-spin' : ''}`} />
                    <span>{isRewriting ? 'Thinking...' : 'AI Assist'}</span>
                  </button>
                </div>
                <textarea 
                  id="reflection" 
                  value={reflection} 
                  onChange={e => { setReflection(e.target.value); setRewriteError(''); }} 
                  rows={10} 
                  className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500" 
                  placeholder="What did this book make you feel? What ideas did it spark? Jot down your unfiltered thoughts..."></textarea>
                {rewriteError && <p className="text-red-500 text-xs mt-1">{rewriteError}</p>}
              </div>
                            
              {error && <p className="text-red-500 text-center">{error}</p>}
              
              <button type="submit" className="w-full bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600 transition-colors duration-300 disabled:bg-slate-400" disabled={isLoading || isProcessingCover}>
                {isLoading ? 'Submitting...' : (isEditMode ? 'Update Entry' : 'Create Entry')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePage;