import React, { createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation } from 'react-router-dom';
import { useEntries } from './hooks/useEntries';
import { BookEntry, CreatedEntryInfo, EntryUpdatePayload, EntrySummary } from './types';
import StartPage from './pages/StartPage';
import CreatePage from './pages/CreatePage';
import MemoryPage from './pages/MemoryPage';
import ListPage from './pages/ListPage';
import { BookOpenIcon } from './components/ui';


interface EntriesContextType {
  loading: boolean;
  addEntry: (entryData: { bookTitle: string; tagline: string; reflection: string; bookCover?: string | null; }) => Promise<{ success: boolean; error?: string; slug?: string; editKey?: string; }>;
  getEntryBySlug: (slug: string) => Promise<Omit<BookEntry, 'editKey'> | undefined>;
  getEntrySummaries: (slugs: string[]) => Promise<EntrySummary[]>;
  deleteEntry: (slug: string, editKey: string) => Promise<{ success: boolean; error?: string }>;
  updateEntry: (slug: string, editKey: string, data: EntryUpdatePayload) => Promise<{ success: boolean; error?: string; }>;
  getAllSlugs: () => string[];
  getCreatedEntries: () => CreatedEntryInfo[];
  removeVisitedSlug: (slug: string) => void;
}

const EntriesContext = createContext<EntriesContextType | undefined>(undefined);

export const useEntriesContext = () => {
  const context = useContext(EntriesContext);
  if (!context) {
    throw new Error('useEntriesContext must be used within a EntriesProvider');
  }
  return context;
};

const EntriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const entriesData = useEntries();
  return (
    <EntriesContext.Provider value={entriesData}>
      {children}
    </EntriesContext.Provider>
  );
};

const Header = () => {
    const location = useLocation();
    const isHomePage = location.pathname === '/';
    const hideCreateButton = location.pathname.startsWith('/create') || location.pathname.startsWith('/edit');

    return (
        <header className={`fixed top-0 left-0 right-0 z-10 transition-all duration-300 ${isHomePage ? 'bg-transparent' : 'bg-white/50 backdrop-blur-sm shadow-sm'}`}>
            <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
                <Link to="/" className="flex items-center space-x-3 text-ink group">
                    <BookOpenIcon className="w-6 h-6 text-teal-600 transition-transform duration-300 group-hover:scale-110" />
                    <span className="font-serif text-xl font-bold group-hover:text-teal-700 transition-colors">Bookfeel</span>
                </Link>
                {!hideCreateButton && (
                    <Link to="/create" className="bg-teal-500 text-white font-bold py-2 px-4 rounded-full text-sm hover:bg-teal-600 transition-colors duration-300 transform hover:scale-105">
                        + New Entry
                    </Link>
                )}
            </nav>
        </header>
    );
};

const AppLayout: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow">
                <Outlet />
            </main>
            <footer className="text-center py-4 text-slate-500 text-sm">
                <p>A sanctuary for your literary journeys. 📖</p>
            </footer>
        </div>
    );
};

const NotFoundPage = () => (
    <div className="min-h-screen flex items-center justify-center text-center px-4 pt-20">
        <div>
            <h1 className="text-4xl font-bold font-serif text-ink">404 - Page Not Found</h1>
            <p className="mt-4 text-lg text-slate-600">The page you are looking for does not exist.</p>
            <Link to="/" className="mt-8 inline-block bg-teal-500 text-white font-bold py-2 px-4 rounded-full hover:bg-teal-600 transition-colors duration-300">
                Return Home
            </Link>
        </div>
    </div>
);

function App() {
  return (
    <EntriesProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<StartPage />} />
            <Route path="create" element={<CreatePage />} />
            <Route path="edit/:slug" element={<CreatePage />} />
            <Route path="memory/:slug" element={<MemoryPage />} />
            <Route path="list" element={<ListPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </EntriesProvider>
  );
}

export default App;