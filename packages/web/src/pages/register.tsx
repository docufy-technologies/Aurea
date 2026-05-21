import { Link } from 'react-router-dom';
import { RegisterForm } from '../features/auth/components/register-form';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function Register() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative selection:bg-amber-500/30 overflow-x-hidden">
      {/* Decorative top-center blurred glow background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[300px] bg-gradient-to-b from-amber-500/5 via-amber-500/0 to-transparent rounded-full blur-[80px] pointer-events-none -z-10" />

      {/* Header / Brand */}
      <header className="px-6 py-6 border-b border-zinc-900/60 bg-zinc-950/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="font-display font-bold text-xl tracking-widest bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
              AUREA
            </span>
          </Link>
          
          <Link to="/" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO LANDING</span>
          </Link>
        </div>
      </header>

      {/* Main Registration Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-16">
        <div className="max-w-md w-full">
          <RegisterForm />
          
          <p className="text-center text-zinc-500 text-xs mt-6">
            Already have an account?{' '}
            <Link to="/#" className="text-amber-500 font-semibold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-905 bg-zinc-950/40 text-center">
        <span className="text-[10px] text-zinc-600 tracking-wider">
          © 2026 DOCUFY TECH. ALL RIGHTS RESERVED.
        </span>
      </footer>
    </div>
  );
}
