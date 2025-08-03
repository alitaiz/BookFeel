import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEntriesContext } from '../App';
import { BookEntry } from '../types';
import { BookOpenIcon, Toast } from '../components/ui';

const MemoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getEntryBySlug, loading, getCreatedEntries, removeVisitedSlug } = useEntriesContext();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Omit<BookEntry, 'editKey'> | null>(null);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [recoverCode, setRecoverCode] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    let isMounted = true;
    // When slug changes, reset the page state to show loading indicator
    setEntry(null);
    setError('');
    
    const fetchEntry = async () => {
      if (slug) {
        const createdEntries = getCreatedEntries();
        const ownerInfo = createdEntries.find(m => m.slug === slug);
        if (isMounted) {
          setIsOwner(!!ownerInfo);
        }

        const foundEntry = await getEntryBySlug(slug);
        if (isMounted) {
          if (foundEntry) {
            setEntry(foundEntry);
          } else {
            // If entry is not found, it might have been deleted.
            // Remove it from local history to prevent getting stuck in a redirect loop.
            removeVisitedSlug(slug);
            setError(`Could not find an entry with code "${slug}".`);
            setTimeout(() => navigate(`/recover?notfound=true&slug=${slug}`), 2500);
          }
        }
      }
    };

    fetchEntry();
    return () => { isMounted = false; };
  }, [slug, getEntryBySlug, navigate, getCreatedEntries, removeVisitedSlug]);
  
  const handleRecoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = recoverCode.trim();
    if (trimmedCode) {
        // Navigate to the new entry page. This will trigger the useEffect above.
        navigate(`/memory/${trimmedCode}`);
        setRecoverCode('');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
        setToastMessage('Link copied to clipboard!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    }, (err) => {
        console.error('Could not copy text: ', err);
        setToastMessage('Failed to copy link.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    });
  };

  if (loading && !entry) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-cream text-center p-4">
            <BookOpenIcon className="w-16 h-16 text-slate-400 animate-pulse" />
            <p className="mt-4 font-serif text-slate-600 text-xl">Finding this reflection...</p>
        </div>
    );
  }
  
  if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-cream text-center p-4">
            <h2 className="text-2xl font-serif text-red-500">{error}</h2>
            <p className="mt-2 text-slate-600">You will be redirected to the recovery page shortly.</p>
        </div>
      )
  }

  if (!entry) {
    // This state is briefly hit before loading starts or if slug is missing.
    return null; 
  }

  const coverImage = entry.bookCover || "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80";

  return (
    <div className="min-h-screen bg-paper">
      <Toast message={toastMessage} show={showToast} onDismiss={() => setShowToast(false)} />
      {/* Hero Section */}
      <div className="relative h-80 md:h-96 w-full flex items-center justify-center text-white text-center pb-16">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${coverImage})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
        <div className="relative z-10 p-4 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold font-serif drop-shadow-lg">{entry.bookTitle}</h1>
          <p className="mt-4 text-xl font-serif italic drop-shadow-md">"{entry.tagline || 'A story to remember.'}"</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto max-w-3xl p-6 md:p-8 -mt-20 relative z-10">
        <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl relative" style={{ paddingTop: entry.bookCover ? '6rem' : '2.5rem' }}>
            {entry.bookCover && (
              <img
                src={entry.bookCover}
                alt={`${entry.bookTitle} cover`}
                className="absolute left-1/2 -translate-x-1/2 -top-16 w-32 h-32 rounded-full object-cover border-8 border-white bg-white shadow-lg"
              />
            )}
          <div className="text-center mb-8 space-y-2">
              <button onClick={handleCopyLink} className="bg-blue-100 text-blue-800 text-sm font-semibold py-2 px-4 rounded-full hover:bg-blue-200 transition-colors">
                  🔗 Share by copying this page's link
              </button>
            {isOwner && (
              <div>
                <Link to={`/edit/${entry.slug}`} className="text-xs text-slate-500 hover:text-slate-700 underline">
                    Edit Entry
                </Link>
              </div>
            )}
          </div>

          <div className="prose prose-lg max-w-none text-ink whitespace-pre-wrap font-sans text-justify">
            <p>{entry.reflection}</p>
          </div>
        </div>
      </div>
      
      <div className="text-center py-12 px-4 flex flex-col items-center space-y-4">
        <Link to="/create" className="bg-blue-400 text-white font-bold py-3 px-6 rounded-full hover:bg-blue-500 transition-colors duration-300">
          Create Another Entry
        </Link>
        <a href="https://bobicare.com" target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white font-bold py-3 px-6 rounded-full hover:bg-green-600 transition-colors duration-300">
          Visit Our Store on Amazon
        </a>
        
        {/* Search Form */}
        <div className="mt-8 max-w-md w-full">
            <div className="bg-cream/60 p-6 rounded-2xl shadow-lg">
                <form onSubmit={handleRecoverSubmit}>
                    <label htmlFor="recover-code-memory" className="font-serif text-ink">Have an entry code?</label>
                    <div className="mt-2 flex space-x-2">
                        <input
                            id="recover-code-memory"
                            type="text"
                            value={recoverCode}
                            onChange={(e) => setRecoverCode(e.target.value)}
                            placeholder="e.g., a1b2c3d4e5f6"
                            className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-teal-500 focus:border-teal-500"
                            aria-label="Entry Code Input"
                        />
                        <button type="submit" aria-label="Find entry" className="bg-blue-400 text-white p-3 rounded-full hover:bg-blue-500 transition-colors shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryPage;