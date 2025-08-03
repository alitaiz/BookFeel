
export interface BookEntry {
  slug: string;
  bookTitle: string;
  bookCover?: string | null; // URL of book cover image
  tagline: string;
  reflection: string;
  images: string[]; // Array of public image URLs for inspirational images
  createdAt: string; // ISO date string
  editKey: string; // Secret key for editing/deleting
}

export interface EntrySummary {
  slug: string;
  bookTitle: string;
  createdAt: string;
}

export interface CreatedEntryInfo {
  slug: string;
  editKey: string;
}

export interface EntryUpdatePayload {
  bookTitle: string;
  tagline: string;
  reflection: string;
  images: string[];
  bookCover?: string | null; // null to remove cover
}
