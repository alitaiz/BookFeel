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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredEntries = entries.filter(entry =>
    entry.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.tagline && entry.tagline.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-cream pt-24 pb-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold font-serif text-center text-ink">Your Book Reflections</h1>
          <p className="text-center text-slate-600 mt-2">A list of reflections you have created or visited.</p>
          
          <div className="mt-6">
            <input
              type="text"
              placeholder="Search by title or one-line summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-full shadow-sm focus:ring-teal-500 focus:border-teal-500"
              aria-label="Search your entries"
            />
          </div>

          {error && <p className="text-red-500 text-center mt-4 p-2 bg-red-100 rounded-md">{error}</p>}

          {loading ? (
             <div className="flex justify-center items-center py-10">
                <BookOpenIcon className="animate-spin w-10 h-10 text-teal-500"/>
                <p className="ml-4 font-serif text-slate-600">Loading your reflections...</p>
             </div>
          ) : filteredEntries.length > 0 ? (
            <div className="mt-4 space-y-4">
              {filteredEntries.map(entry => {
                const isOwner = createdEntries.some(cm => cm.slug === entry.slug);
                return <EntryCard key={entry.slug} entry={entry} onDelete={handleDelete} isOwner={isOwner} />
              })}
            </div>
          ) : (
            <p className="text-center mt-8 text-slate-500">
              {searchQuery ? `No entries match "${searchQuery}".` : "You haven't created or visited any entries on this device yet."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListPage;