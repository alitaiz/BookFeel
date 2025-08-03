import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEntriesContext } from '../App';
import { BookOpenIcon } from '../components/ui';

const StartPage = () => {
  const { getAllSlugs } = useEntriesContext();
  const navigate = useNavigate();
  const [allSlugs, setAllSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slugs = getAllSlugs();
    setAllSlugs(slugs);
    // If user has only ever created or visited one entry on this device, redirect them
    if (slugs.length === 1) {
      // Use replace to avoid the user being able to click "back" to this page
      navigate(`/memory/${slugs[0]}`, { replace: true });
    } else {
      setLoading(false);
    }
  // The dependency array is carefully constructed to only run this once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><BookOpenIcon className="animate-spin w-12 h-12 text-teal-500"/></div>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-cream">
      <div className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm" style={{backgroundImage: "url('https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1200')"}}></div>
      <div className="relative container mx-auto px-6 py-24 text-center">
        {allSlugs.length > 0 ? (
          <div className="bg-white/60 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-ink">Welcome back 📚</h1>
            <p className="mt-4 text-slate-600">You can find the reflections you've created or visited on this device below.</p>
            <div className="mt-6">
                <Link to="/list" className="bg-blue-400 text-white font-semibold py-3 px-6 rounded-full hover:bg-blue-500 transition-colors text-lg transform hover:scale-105 inline-block">View Your Entries</Link>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink">
              A quiet space to capture your thoughts on the books you've read 📖
            </h1>
            <p className="mt-6 text-lg text-slate-700">
              Reflect on stories, characters, and ideas that moved you.
            </p>
            <div className="mt-10">
                <Link to="/create" className="inline-block bg-teal-500 text-white font-bold py-4 px-8 rounded-full hover:bg-teal-600 transition-transform duration-300 text-lg transform hover:scale-105">
                Create Your First Entry
                </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StartPage;