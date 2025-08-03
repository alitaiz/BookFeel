
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useEntriesContext } from '../App';
import { EntryCard, BookOpenIcon } from '../components/ui';
import { EntrySummary, CreatedEntryInfo } from '../types';

const ListPage = () => {
  const { getAllSlugs, deleteEntry, getCreatedEntries, removeVisitedSlug, getEntrySummaries } = useEntriesContext();
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [createdEntries, setCreatedEntries] = useState<CreatedEntryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    const slugs = getAllSlugs();
    const created = getCreatedEntries();
    setCreatedEntries(created);

    if (slugs.length > 0) {
      const fetchedEntries = await getEntrySummaries(slugs);
      // Sort on the client side after fetching
      setEntries(fetchedEntries.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } else {
      setEntries([]);
    }
    setLoading(false);
  }, [getAllSlugs, getCreatedEntries, getEntrySummaries]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);
  
  const handleDelete = async (slug: string) => {
    setError('');
    const ownedEntry = createdEntries.find(cm => cm.slug === slug);

    if (ownedEntry) {
      // User is the owner: permanent deletion
      if (window.confirm("Are you sure you want to permanently delete this entry? This will remove all data and photos forever and cannot be undone.")) {
        const result = await deleteEntry(slug, ownedEntry.editKey);
        if (result.success) {
          // Refresh the list from source of truth
          loadEntries();
        } else {
          setError(result.error || 'An unknown error occurred while deleting.');
        }
      }
    } else {
      // User is a visitor: remove from local list
      if (window.confirm("Are you sure you want to remove this entry from your list? This will not delete the original page.")) {
        removeVisitedSlug(slug);
        // Refresh the list from source of truth
        loadEntries();
      }
    }
  };

  return (
    <div className="min-h-screen bg-cream pt-24 pb-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold font-serif text-center text-ink">Your Book Reflections</h1>
          <p className="text-center text-slate-600 mt-2">A list of reflections you have created or visited.</p>
          
          {error && <p className="text-red-500 text-center mt-4 p-2 bg-red-100 rounded-md">{error}</p>}

          {loading ? (
             <div className="flex justify-center items-center py-10">
                <BookOpenIcon className="animate-spin w-10 h-10 text-teal-500"/>
                <p className="ml-4 font-serif text-slate-600">Loading your reflections...</p>
             </div>
          ) : entries.length > 0 ? (
            <div className="mt-8 space-y-4">
              {entries.map(entry => {
                const isOwner = createdEntries.some(cm => cm.slug === entry.slug);
                return <EntryCard key={entry.slug} entry={entry} onDelete={handleDelete} isOwner={isOwner} />
              })}
            </div>
          ) : (
            <p className="text-center mt-8 text-slate-500">You haven't created or visited any entries on this device yet.</p>
          )}

          <div className="mt-8 text-center">
            <Link to="/create" className="bg-teal-500 text-white font-bold py-3 px-6 rounded-full hover:bg-teal-600 transition-transform duration-300 inline-block transform hover:scale-105">
              ➕ Create a New Entry
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListPage;
