import React from 'react';
import { Link } from 'react-router-dom';
import { EntrySummary } from '../types';

export const BookOpenIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h15v-2H6.012C5.55 19.988 5 19.805 5 19s.55-.988 1.012-1H21V4c0-1.103-.897-2-2-2zM6 4h13v13H6V4z"></path>
        <path d="M8 6h9v2H8zM8 9h9v2H8zM8 12h5v2H8z"></path>
    </svg>
);

export const QuillIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.648 3.51a.692.692 0 0 0-.211-.212c-.227-.145-.51-.186-.777-.118l-3.368.875c-2.493.648-4.148 2.303-4.796 4.796l-.875 3.368c-.068.267-.027.55.118.777.145.227.382.359.632.359.076 0 .153-.01.23-.03l.211-.055 4.908-1.277c.18-.047.323-.19.37-.37l1.277-4.908.055-.211c.02-.077.03-.154.03-.23 0-.25-.132-.487-.359-.632zM8.883 8.325l.582-2.241c.423-1.628 1.54-2.745 3.168-3.168l2.241-.582-1.054 4.06-4.06 1.054-2.241-7.295c-.397.23-.74.573-1.016 1.016l7.295 2.241z"></path>
        <path d="M20 18H8v-2H6v4h14c1.103 0 2-.897 2-2V8h-2v10z"></path>
    </svg>
);


export const LoadingSpinner = () => (
    <div className="flex justify-center items-center space-x-2">
        <BookOpenIcon className="animate-pulse text-teal-500 w-8 h-8" />
        <p className="font-serif text-slate-600">Recording your thoughts...</p>
    </div>
);

export const Toast = ({ message, show, onDismiss }: { message: string, show: boolean, onDismiss: () => void }) => {
    if (!show) return null;
    return (
        <div className="fixed bottom-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg flex items-center transition-opacity duration-300">
            <span>{message} 📖</span>
            <button onClick={onDismiss} className="ml-4 text-xl font-bold">&times;</button>
        </div>
    );
};

interface EntryCardProps {
  entry: EntrySummary;
  onDelete: (slug: string) => void;
  isOwner: boolean;
}

export const EntryCard = ({ entry, onDelete, isOwner }: EntryCardProps) => (
  <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl shadow-md flex items-center justify-between transition-transform duration-300 hover:scale-105 hover:shadow-lg">
    <div className="flex items-center space-x-4 flex-grow min-w-0">
      {entry.bookCover ? (
        <img src={entry.bookCover} alt={`${entry.bookTitle} cover`} className="w-12 h-16 rounded-md object-cover bg-slate-100 flex-shrink-0" />
      ) : (
        <div className={`w-12 h-16 rounded-md flex-shrink-0 flex items-center justify-center ${isOwner ? 'bg-teal-100' : 'bg-gray-100'}`}>
            <BookOpenIcon className={`w-6 h-6 ${isOwner ? 'text-teal-600' : 'text-slate-400'}`} />
        </div>
      )}
      <div className="flex-grow min-w-0">
        <p className="font-serif font-bold text-ink truncate">{entry.bookTitle}</p>
        <p className="text-sm text-slate-500 truncate">{entry.tagline || 'No one-line summary provided.'}</p>
        <p className="text-xs text-slate-400 mt-1">
            {new Date(entry.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
    <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
      <Link to={`/memory/${entry.slug}`} className="bg-blue-400 text-white px-3 py-1 rounded-full text-sm font-semibold hover:bg-blue-500 transition-colors">
        Visit
      </Link>
      <button 
        onClick={() => onDelete(entry.slug)} 
        className="text-red-400 hover:text-red-600 transition-colors p-1"
        title="Permanently delete this entry"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </div>
  </div>
);