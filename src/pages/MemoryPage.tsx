import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { BookEntry } from '../types';
import { BookOpenIcon } from '../components/ui';

const MemoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getEntryBySlug, loading, getCreatedEntries } = useAppContext();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<Omit<BookEntry, 'editKey'> | null>(null);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let isMounted = true;
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
            setError(`Could not find an entry with code "${slug}". It may be private or has been deleted.`);
            setTimeout(() => navigate(`/list`), 2500);
          }
        }
      }
    };

    fetchEntry();
    return () => { isMounted = false; };
  }, [slug, getEntryBySlug, navigate, getCreatedEntries]);

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
            <p className="mt-2 text-slate-600">You will be redirected shortly.</p>
        </div>
      )
  }

  if (!entry) {
    return null; 
  }

  const coverImage = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200&q=80";
  const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-paper">
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
            <p className="text-sm text-slate-500">Created on {formattedDate}</p>
            {isOwner && (
              <div className="flex items-center justify-center space-x-4">
                <Link to={`/edit/${entry.slug}`} className="text-xs text-slate-500 hover:text-slate-700 underline">
                    Edit Entry
                </Link>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${entry.privacy === 'private' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                    {entry.privacy === 'private' ? 'Private' : 'Public'}
                </span>
              </div>
            )}
          </div>

          <div className="prose prose-lg max-w-none text-ink whitespace-pre-wrap font-sans text-justify">
            <p>{entry.reflection}</p>
          </div>
        </div>
      </div>
      
      <div className="text-center py-12 px-4 flex flex-col items-center space-y-4">
        <Link to="/list" className="bg-blue-400 text-white font-bold py-3 px-6 rounded-full hover:bg-blue-500 transition-colors duration-300">
          View All Entries
        </Link>
        <a href="https://bobicare.com" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-slate-700 hover:underline transition-colors duration-300">
          Visit Our Store on Amazon
        </a>
      </div>
    </div>
  );
};

export default MemoryPage;