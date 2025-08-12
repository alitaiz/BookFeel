import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { BookOpenIcon, HeartIcon } from '../components/ui';
import { EntrySummary } from '../types';

const PublicEntryCard = ({ entry }: { entry: EntrySummary }) => {
    const { likeEntry, unlikeEntry, isLiked } = useAppContext();
    const [likes, setLikes] = useState(entry.likeCount || 0);
    const [liked, setLiked] = useState(isLiked(entry.slug));

    useEffect(() => {
        setLiked(isLiked(entry.slug));
    }, [isLiked, entry.slug]);

    const handleLikeToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (liked) {
            const result = await unlikeEntry(entry.slug);
            if (result.success && result.likeCount !== undefined) {
                setLikes(result.likeCount);
                setLiked(false);
            }
        } else {
            const result = await likeEntry(entry.slug);
            if (result.success && result.likeCount !== undefined) {
                setLikes(result.likeCount);
                setLiked(true);
            }
        }
    }

    return (
        <Link to={`/memory/${entry.slug}`} className="block bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl group">
            <div className="flex flex-col h-full">
                <div className="flex items-start space-x-4">
                    {entry.bookCover ? (
                        <img src={entry.bookCover} alt={`${entry.bookTitle} cover`} className="w-12 h-16 rounded-md object-cover bg-slate-100 flex-shrink-0" />
                    ) : (
                        <div className="w-12 h-16 rounded-md flex-shrink-0 flex items-center justify-center bg-teal-100">
                            <BookOpenIcon className="w-6 h-6 text-teal-600" />
                        </div>
                    )}
                    <div className="flex-grow min-w-0">
                        <p className="font-serif font-bold text-ink group-hover:text-teal-700 transition-colors truncate">{entry.bookTitle}</p>
                        <p className="text-sm text-slate-500 line-clamp-2">{entry.tagline || 'No one-line summary provided.'}</p>
                    </div>
                </div>
                <div className="mt-auto pt-3 flex justify-end items-center">
                    <button
                        onClick={handleLikeToggle}
                        className="flex items-center space-x-1.5 text-slate-600 group/like"
                        aria-label={`Like this entry. Current likes: ${likes}`}
                    >
                        <HeartIcon className={`w-5 h-5 transition-all ${liked ? 'text-red-500' : 'text-slate-400 group-hover/like:text-red-400'}`} filled={liked} />
                        <span className="font-semibold text-sm">{likes}</span>
                    </button>
                </div>
            </div>
        </Link>
    );
};


const StartPage = () => {
  const { getCreatedEntries, user, getPublicFeed } = useAppContext();
  const [createdEntries, setCreatedEntries] = useState<string[]>([]);
  const [publicFeed, setPublicFeed] = useState<EntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    const entries = getCreatedEntries();
    setCreatedEntries(entries.map(e => e.slug));
    setLoading(false);

    getPublicFeed().then(feed => {
        setPublicFeed(feed);
        setFeedLoading(false);
    });
  // The dependency array is carefully constructed to only run this once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><BookOpenIcon className="animate-spin w-12 h-12 text-teal-500"/></div>;
  }
  
  const hasOwnEntries = createdEntries.length > 0;

  return (
    <div className="min-h-screen bg-cream">
      <div className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm" style={{backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200')"}}></div>
      <div className="relative container mx-auto px-6 pt-24 pb-12">
        <div className="text-center max-w-2xl mx-auto">
            {hasOwnEntries ? (
            <div className="bg-white/60 backdrop-blur-md p-8 rounded-2xl shadow-xl">
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-ink">Welcome back, {user?.name || 'Reader'} 📚</h1>
                <p className="mt-4 text-slate-600">You can find the reflections you've created on this device below.</p>
                <div className="mt-6">
                    <Link to="/list" className="bg-blue-400 text-white font-semibold py-3 px-6 rounded-full hover:bg-blue-500 transition-colors text-lg transform hover:scale-105 inline-block">View Your Entries</Link>
                </div>
            </div>
            ) : (
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink">
                A quiet space for your literary journeys 📖
                </h1>
                <p className="mt-6 text-lg text-slate-700">
                Reflect on stories, characters, and ideas that moved you, {user?.name}.
                </p>
                <div className="mt-10">
                    <Link to="/create" className="inline-block bg-teal-500 text-white font-bold py-4 px-8 rounded-full hover:bg-teal-600 transition-transform duration-300 text-lg transform hover:scale-105">
                    Create Your First Entry
                    </Link>
                </div>
            </div>
            )}
        </div>

        {(feedLoading && !loading) && (
            <div className="mt-16 flex justify-center items-center">
                <BookOpenIcon className="animate-spin w-8 h-8 text-teal-500" />
                <p className="ml-4 font-serif text-slate-600">Loading reflections from the community...</p>
            </div>
        )}

        {(!feedLoading && publicFeed.length > 0) && (
            <div className="mt-16 max-w-5xl mx-auto">
                <h2 className="text-2xl font-serif font-bold text-ink text-center">Community Reflections</h2>
                <p className="text-center text-slate-600 mt-2 mb-8">Explore thoughts from fellow readers.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {publicFeed.map(entry => (
                        <PublicEntryCard key={entry.slug} entry={entry} />
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default StartPage;