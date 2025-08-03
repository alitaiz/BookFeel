export interface BookEntry {
  slug: string;
  bookTitle: string;
  bookCover?: string | null; // URL of book cover image
  tagline: string;
  reflection: string;
  createdAt: string; // ISO date string
  editKey: string; // Secret key for editing/deleting
}

export interface EntrySummary {
  slug: string;
  bookTitle: string;
  createdAt: string;
  tagline: string;
  bookCover?: string | null;
}

export interface CreatedEntryInfo {
  slug: string;
  editKey: string;
}

export interface EntryUpdatePayload {
  bookTitle: string;
  tagline: string;
  reflection: string;
  bookCover?: string | null; // null to remove cover
}