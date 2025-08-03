import { useState, useCallback, useEffect } from 'react';
import { User, BookEntry, CreatedEntryInfo, EntryUpdatePayload, EntrySummary } from '../types';
import { API_BASE_URL } from '../config';
import { generateUUID } from '../utils/uuid';

const LOCAL_USER_KEY = 'bookfeel_user';
const LOCAL_CREATED_ENTRIES_KEY = 'bookfeel_created_entries';

interface FullUser extends User {
  entries: CreatedEntryInfo[];
}

export const useApp = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(LOCAL_USER_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to load user from local storage", error);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  // --- Local storage management for OWNED entries ---
  const getCreatedEntries = useCallback((): CreatedEntryInfo[] => {
    try {
      const stored = localStorage.getItem(LOCAL_CREATED_ENTRIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);
  
  const syncCreatedEntries = useCallback((entries: CreatedEntryInfo[]) => {
      localStorage.setItem(LOCAL_CREATED_ENTRIES_KEY, JSON.stringify(entries));
  }, []);

  const addCreatedEntry = useCallback((slug: string, editKey: string) => {
    const created = getCreatedEntries();
    if (!created.some(m => m.slug === slug)) {
      const newCreated = [...created, { slug, editKey }];
      syncCreatedEntries(newCreated);
    }
  }, [getCreatedEntries, syncCreatedEntries]);
  
  const removeCreatedEntry = useCallback((slug: string) => {
     const created = getCreatedEntries();
     const updated = created.filter(m => m.slug !== slug);
     syncCreatedEntries(updated);
  }, [getCreatedEntries, syncCreatedEntries]);
  
  const refreshUserEntries = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
        return { success: false, error: "No user is currently logged in." };
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`);
        if (response.ok) {
            const fullUser: FullUser = await response.json();
            syncCreatedEntries(fullUser.entries);
            return { success: true };
        } else {
            const errorData = await response.json().catch(() => ({}));
            const error = errorData.error || `Failed to refresh user data. Status: ${response.status}`;
            console.error(error);
            return { success: false, error };
        }
    } catch (error) {
        console.error("API call to refresh user entries failed:", error);
        return { success: false, error: "A network error occurred while refreshing your data." };
    }
  }, [user, syncCreatedEntries]);

  // --- User Authentication ---
  const login = useCallback(async (id: string): Promise<{ success: boolean, error?: string }> => {
    setIsLoadingUser(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${id.trim()}`);
        if (response.ok) {
            const fullUser: FullUser = await response.json();
            const userData: User = { id: fullUser.id, name: fullUser.name };
            localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(userData));
            syncCreatedEntries(fullUser.entries);
            setUser(userData);
            return { success: true };
        } else {
            const errorData = await response.json().catch(() => ({}));
            return { success: false, error: errorData.error || `Login failed. Status: ${response.status}` };
        }
    } catch(error) {
        console.error("API call to login failed:", error);
        return { success: false, error: "Network error. Please check your connection and try again." };
    } finally {
        setIsLoadingUser(false);
    }
  }, [syncCreatedEntries]);

  const logout = useCallback(() => {
    localStorage.removeItem(LOCAL_USER_KEY);
    localStorage.removeItem(LOCAL_CREATED_ENTRIES_KEY);
    setUser(null);
  }, []);

  const createUser = useCallback(async (name: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const newUser: User = await response.json();
        // Don't log in automatically, let the UI show the ID first
        return { success: true, user: newUser };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || 'Failed to create user.' };
      }
    } catch (error) {
      console.error("API call to createUser failed:", error);
      return { success: false, error: 'Network error. Could not create user.' };
    } finally {
      setLoading(false);
    }
  }, []);

  // --- API Functions for entries ---
  const addEntry = useCallback(async (entryData: { bookTitle: string; tagline: string; reflection: string; bookCover?: string | null; }): Promise<{ success: boolean; error?: string, slug?: string, editKey?: string }> => {
    if (!user) return { success: false, error: "User not authenticated." };
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
        headers: { 'Content-Type': 'application/json', 'X-User-ID': user.id },
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
  }, [user, addCreatedEntry]);
  
  const getEntryBySlug = useCallback(async (slug: string): Promise<Omit<BookEntry, 'editKey'> | undefined> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/entry/${slug}`);
      if (!response.ok) {
        return undefined;
      }
      const data: Omit<BookEntry, 'editKey'> = await response.json();
      return data;
    } catch (error) {
      console.error("API call to getEntryBySlug failed:", error);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (!user) return { success: false, error: "User not authenticated." };
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/entry/${slug}`, {
        method: 'DELETE',
        headers: {
            'X-Edit-Key': editKey,
            'X-User-ID': user.id
        }
      });

      if (response.ok) {
        removeCreatedEntry(slug);
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
  }, [user, removeCreatedEntry]);
  
  const updateEntry = useCallback(async (slug: string, editKey: string, data: EntryUpdatePayload): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "User not authenticated." };
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
  }, [user]);

  return { 
    user,
    isLoadingUser,
    login,
    logout,
    createUser,
    loading, 
    addEntry, 
    getEntryBySlug,
    getEntrySummaries,
    deleteEntry,
    updateEntry,
    getCreatedEntries,
    refreshUserEntries,
  };
};
