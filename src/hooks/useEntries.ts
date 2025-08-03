import { useState, useCallback } from 'react';
import { BookEntry, CreatedEntryInfo, EntryUpdatePayload, EntrySummary } from '../types';
import { API_BASE_URL } from '../config';
import { generateUUID } from '../utils/uuid';

const LOCAL_CREATED_ENTRIES_KEY = 'bookfeel_created_entries';
const LOCAL_VISITED_SLUGS_KEY = 'bookfeel_visited_slugs';

// This hook manages interactions with the remote API and local storage for ownership/access
export const useEntries = () => {
  const [loading, setLoading] = useState<boolean>(false);

  // --- Local storage management for OWNED entries ---
  const getCreatedEntries = useCallback((): CreatedEntryInfo[] => {
    try {
      const stored = localStorage.getItem(LOCAL_CREATED_ENTRIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);
  
  const addCreatedEntry = useCallback((slug: string, editKey: string) => {
    const created = getCreatedEntries();
    if (!created.some(m => m.slug === slug)) {
      const newCreated = [...created, { slug, editKey }];
      localStorage.setItem(LOCAL_CREATED_ENTRIES_KEY, JSON.stringify(newCreated));
    }
  }, [getCreatedEntries]);
  
  const removeCreatedEntry = useCallback((slug: string) => {
     const created = getCreatedEntries();
     const updated = created.filter(m => m.slug !== slug);
     localStorage.setItem(LOCAL_CREATED_ENTRIES_KEY, JSON.stringify(updated));
  }, [getCreatedEntries]);

  // --- Local storage management for VISITED entries ---
  const getVisitedSlugs = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(LOCAL_VISITED_SLUGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const addVisitedSlug = useCallback((slug: string) => {
    const created = getCreatedEntries();
    if (created.some(m => m.slug === slug)) return; // Don't add if we own it

    const visited = getVisitedSlugs();
    if (!visited.includes(slug)) {
      localStorage.setItem(LOCAL_VISITED_SLUGS_KEY, JSON.stringify([...visited, slug]));
    }
  }, [getCreatedEntries, getVisitedSlugs]);

  const removeVisitedSlug = useCallback((slug: string) => {
    const visited = getVisitedSlugs();
    const updated = visited.filter(s => s !== slug);
    localStorage.setItem(LOCAL_VISITED_SLUGS_KEY, JSON.stringify(updated));
  }, [getVisitedSlugs]);

  // --- Combined slugs ---
  const getAllSlugs = useCallback((): string[] => {
    const created = getCreatedEntries().map(m => m.slug);
    const visited = getVisitedSlugs();
    return [...new Set([...created, ...visited])]; // Unique slugs
  }, [getCreatedEntries, getVisitedSlugs]);


  // --- API Functions ---
  const addEntry = useCallback(async (entryData: { bookTitle: string; tagline: string; reflection: string; bookCover?: string | null; }): Promise<{ success: boolean; error?: string, slug?: string, editKey?: string }> => {
    setLoading(true);
    try {
      const { bookTitle, tagline, reflection, bookCover } = entryData;
      // Generate editKey on the client
      const editKey = generateUUID();

      const payload = {
        bookTitle,
        tagline,
        reflection,
        editKey,
        bookCover,
        createdAt: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE_URL}/api/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const { slug } = await response.json();
        addCreatedEntry(slug, editKey);
        return { success: true, slug: slug, editKey: editKey };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || `Failed to create entry. Status: ${response.status}` };
      }
    } catch (error) {
      console.error("API call to addEntry failed:", error);
      return { success: false, error: "Network error. Please check your connection and try again." };
    } finally {
      setLoading(false);
    }
  }, [addCreatedEntry]);
  
  const getEntryBySlug = useCallback(async (slug: string): Promise<Omit<BookEntry, 'editKey'> | undefined> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/entry/${slug}`);
      if (!response.ok) {
        return undefined;
      }
      const data: Omit<BookEntry, 'editKey'> = await response.json();
      addVisitedSlug(slug); // Add to visited list on successful fetch
      return data;
    } catch (error) {
      console.error("API call to getEntryBySlug failed:", error);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [addVisitedSlug]);

  const getEntrySummaries = useCallback(async (slugs: string[]): Promise<EntrySummary[]> => {
    if (slugs.length === 0) {
        return [];
    }
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/entries/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slugs }),
        });

        if (!response.ok) {
            console.error("API call to getEntrySummaries failed:", response.statusText);
            return [];
        }
        
        const data: EntrySummary[] = await response.json();
        return data;
    } catch (error) {
        console.error("Network error during getEntrySummaries:", error);
        return [];
    } finally {
        setLoading(false);
    }
  }, []);

  const deleteEntry = useCallback(async (slug: string, editKey: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/entry/${slug}`, {
        method: 'DELETE',
        headers: {
            'X-Edit-Key': editKey,
        }
      });

      if (response.ok) {
        removeCreatedEntry(slug);
        removeVisitedSlug(slug); // Also remove from visited if it's there
        return { success: true };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `Failed to delete. Server responded with ${response.status}` };
    } catch (error) {
      console.error("API call to deleteEntry failed:", error);
      return { success: false, error: "Network error during deletion. Please check your connection." };
    } finally {
      setLoading(false);
    }
  }, [removeCreatedEntry, removeVisitedSlug]);
  
  const updateEntry = useCallback(async (slug: string, editKey: string, data: EntryUpdatePayload): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/entry/${slug}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Edit-Key': editKey,
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            return { success: true };
        }
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || `Failed to update. Server responded with ${response.status}` };
    } catch (error) {
      console.error("API call to updateEntry failed:", error);
      return { success: false, error: "Network error during update. Please check your connection." };
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    loading, 
    addEntry, 
    getEntryBySlug,
    getEntrySummaries,
    deleteEntry,
    updateEntry,
    getAllSlugs,
    getCreatedEntries,
    removeVisitedSlug,
  };
};