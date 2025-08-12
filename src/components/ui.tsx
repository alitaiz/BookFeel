import React from 'react';
import { Link } from 'react-router-dom';
import { EntrySummary } from '../types';

export const HeartIcon = ({ className, filled }: { className?: string, filled?: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
    </svg>
);

export const BookOpenIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 2H6c-1.206 0-3 .799-3 3v14c0 2.201 1.794 3 3 3h15v-2H6.012C5.55 19.988 5 19.805 5 19s.55-.988 1.012-1H21V4c0-1.103-.897-2-2-2zM6 4h13v13H6V4z"></path>
        <path d="M8 6h9v2H8zM8 9h9v2H8zM8 12h5v2H8z"></path>
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
  <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-transform duration-300 hover:scale-105 hover:shadow-lg">
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
    <div className="flex items-center justify-between sm:justify-end space-x-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${entry.privacy === 'private' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
              {entry.privacy === 'private' ? 'Private' : 'Public'}
          </span>
          {entry.privacy === 'public' && (
            <div className="flex items-center text-sm text-slate-500" title={`${entry.likeCount || 0} likes`}>
                <HeartIcon className="w-4 h-4 mr-1 text-red-500" filled={true}/>
                <span>{entry.likeCount || 0}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
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
  </div>
);
