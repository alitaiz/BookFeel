import React, { useState } from 'react';
import { useAppContext } from '../App';
import { BookOpenIcon } from '../components/ui';
import { User } from '../types';

const AuthPage = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [newUser, setNewUser] = useState<User | null>(null);

  if (newUser) {
    return <ShowIdPage user={newUser} />;
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center pt-20 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl text-center">
          <BookOpenIcon className="w-16 h-16 text-teal-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-serif text-ink">Welcome to Bookfeel</h1>
          <p className="text-slate-600 mt-2">
            {mode === 'signup' ? 'Create an account to save your reflections.' : 'Log in to access your reflections.'}
          </p>
          
          {mode === 'signup' ? <SignupForm onUserCreated={setNewUser} /> : <LoginForm />}

          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="mt-4 text-sm text-teal-600 hover:text-teal-800 font-semibold">
            {mode === 'login' ? "Don't have an account? Create one" : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SignupForm = ({ onUserCreated }: { onUserCreated: (user: User) => void }) => {
    const { createUser, loading } = useAppContext();
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) {
            setError('Please enter your name.');
            return;
        }
        const result = await createUser(name);
        if (result.success && result.user) {
            onUserCreated(result.user);
        } else {
            setError(result.error || 'An unexpected error occurred.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-6">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
              aria-label="Your Name"
              disabled={loading}
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button type="submit" className="w-full mt-4 bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600 transition-colors duration-300 disabled:bg-slate-400" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>
        </form>
    );
};

const LoginForm = () => {
    const { login, isLoadingUser } = useAppContext();
    const [id, setId] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!id.trim() || !/^\d+$/.test(id.trim())) {
            setError('Please enter a valid numeric User ID.');
            return;
        }
        const result = await login(id);
        if (!result.success) {
            setError(result.error || 'Login failed. Please check the ID.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-6">
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Enter your 10-digit User ID"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500"
              aria-label="User ID"
              disabled={isLoadingUser}
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button type="submit" className="w-full mt-4 bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-300 disabled:bg-slate-400" disabled={isLoadingUser}>
              {isLoadingUser ? 'Logging in...' : 'Log In'}
            </button>
        </form>
    );
};

const ShowIdPage = ({ user }: { user: User }) => {
    const { login } = useAppContext();
    
    const handleContinue = () => {
        // Log the user in to proceed to the main app
        login(user.id);
    };

    return (
        <div className="min-h-screen bg-cream flex items-center justify-center pt-20 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white/70 backdrop-blur-md p-8 rounded-2xl shadow-xl text-center">
                <h1 className="text-2xl font-bold font-serif text-ink">Welcome, {user.name}!</h1>
                <p className="text-slate-600 mt-4">Your account has been created. Here is your unique User ID:</p>
                
                <div className="my-4 p-4 bg-teal-50 border-2 border-teal-200 rounded-lg">
                    <p className="text-3xl font-bold text-teal-700 tracking-widest">{user.id}</p>
                </div>
                
                <div className="text-left text-sm bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md">
                    <p className="font-bold">Please save this ID in a safe place!</p>
                    <p>You will need it to log in on other devices. This ID cannot be recovered if you lose it.</p>
                </div>

                <button onClick={handleContinue} className="w-full mt-6 bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors duration-300">
                  I have saved my ID. Continue!
                </button>
            </div>
          </div>
        </div>
    );
};


export default AuthPage;