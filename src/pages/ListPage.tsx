import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../App';
import { EntryCard, BookOpenIcon } from '../components/ui';
import { EntrySummary, CreatedEntryInfo } from '../types';

const ITEMS_PER_PAGE = 5;

const ListPage = () => {
  const { deleteEntry, getCreatedEntries, getEntrySummaries, refreshUserEntries } = useAppContext();
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [createdEntries, setCreatedEntries] = useState<CreatedEntryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError('');
    
    // First, refresh the list of entry slugs from the server.
    await refreshUserEntries();
    
    // Then, get the (now updated) list from local storage.
    const created = getCreatedEntries();
    setCreatedEntries(created);
    const slugs = created.map(c => c.slug);

    if (slugs.length > 0) {
      const fetchedEntries = await getEntrySummaries(slugs);
      // Sort on the client side after fetching
      setEntries(fetchedEntries.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } else {
      setEntries([]);
    }
    setLoading(false);
  }, [getCreatedEntries, getEntrySummaries, refreshUserEntries]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);
  
  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleDelete = async (slug: string) => {
    setError('');
    const ownedEntry = createdEntries.find(cm => cm.slug === slug);

    if (ownedEntry) {
      if (window.confirm("Are you sure you want to permanently delete this entry? This action cannot be undone.")) {
        const result = await deleteEntry(slug, ownedEntry.editKey);
        if (result.success) {
          loadEntries();
        } else {
          setError(result.error || 'An unknown error occurred while deleting.');
        }
      }
    } else {
      // This case should ideally not happen in the new user-centric model
      setError("Cannot delete an entry you do not own.");
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.tagline && entry.tagline.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Pagination Logic
  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
  const indexOfLastEntry = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstEntry = indexOfLastEntry - ITEMS_PER_PAGE;
  const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);
  
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };


  return (
    <div className="min-h-screen bg-cream pt-24 pb-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold font-serif text-center text-ink">Your Book Reflections</h1>
          <p className="text-center text-slate-600 mt-2">A list of all the reflections you have created.</p>
          
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
          ) : currentEntries.length > 0 ? (
            <>
              <div className="mt-4 space-y-4">
                {currentEntries.map(entry => {
                  // In this new model, all listed entries are owned by the user.
                  return <EntryCard key={entry.slug} entry={entry} onDelete={() => handleDelete(entry.slug)} isOwner={true} />
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex justify-between items-center">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-md bg-white py-2 px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Go to previous page"
                  >
                    &larr; Previous
                  </button>
                  <span className="text-sm text-slate-600 font-serif">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-md bg-white py-2 px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Go to next page"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center mt-8 text-slate-500">
                <p>{searchQuery ? `No entries match "${searchQuery}".` : "You haven't created any entries yet."}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListPage;