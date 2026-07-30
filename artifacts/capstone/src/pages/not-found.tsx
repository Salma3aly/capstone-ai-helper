import { Link } from 'wouter';
import { HomeIcon, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
      <div className="text-center max-w-sm animate-blur-in">
        <div className="text-8xl font-black animate-gradient-text mb-4">404</div>
        <h1 className="text-2xl font-black text-[#0f172a] mb-3">Page not found</h1>
        <p className="text-gray-500 mb-8">Looks like this page went somewhere else. Let's get you back on track.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ec4899] to-[#a855f7] text-white font-bold rounded-xl hover:shadow-md transition">
            <HomeIcon className="w-4 h-4" /> Go Home
          </Link>
          <button onClick={() => window.history.back()} className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:border-[#ec4899] hover:text-[#ec4899] transition">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
