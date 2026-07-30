import { useState } from 'react';
import { useLocation } from 'wouter';
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, Phone, Building2, Users, UserCheck } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function AuthPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', userType: '', grade: '', phone: '', organization: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (mode === 'register' && form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      const body: Record<string, string> = { name: form.name, email: form.email, password: form.password };
      if (mode === 'register') { body.userType = form.userType; body.grade = form.grade; body.phone = form.phone; body.organization = form.organization; }
      const res = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
      localStorage.setItem('capstone_token', data.token);
      localStorage.setItem('capstone_user', JSON.stringify(data.user));
      localStorage.setItem('capstone_signed_in', 'true');
      navigate('/dashboard');
    } catch { setError('Could not connect to server'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-pink-50/30 to-purple-50/30 p-4 relative overflow-hidden">
      <div className="absolute inset-0 blueprint-grid opacity-30" />
      <div className="glow-orb mesh-orb-1 bg-[#ec4899] w-[500px] h-[500px] -top-40 -left-40 opacity-25" />
      <div className="glow-orb mesh-orb-2 bg-[#a855f7] w-[550px] h-[550px] -bottom-40 -right-40 opacity-22" />
      <div className="glow-orb mesh-orb-3 bg-[#3b82f6] w-[400px] h-[400px] top-1/2 right-1/4 opacity-18" />
      <div className="w-full max-w-md relative z-10">
        <div className="glass-card rounded-3xl p-8 border border-white/70 shadow-2xl hover:shadow-3xl transition-shadow duration-300">
          <div className="text-center mb-8 flex flex-col items-center">
            <Logo size={52} textSize="text-2xl" />
            <p className="text-sm text-gray-600 mt-3 font-medium">{mode === 'login' ? 'Welcome back to Lipo AI!' : 'Join thousands of students'}</p>
          </div>
          <div className="flex bg-gradient-to-r from-slate-50 to-purple-50/50 backdrop-blur-sm rounded-2xl p-1.5 mb-6 border border-white/60 shadow-inner">
            <button onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${mode === 'login' ? 'bg-white text-[#ec4899] shadow-lg border border-pink-100' : 'text-gray-600 hover:text-gray-900'}`}>Sign In</button>
            <button onClick={() => { setMode('register'); setError(''); }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${mode === 'register' ? 'bg-white text-[#a855f7] shadow-lg border border-purple-100' : 'text-gray-600 hover:text-gray-900'}`}>Register</button>
          </div>
          {error && <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 text-xs font-semibold p-3.5 rounded-xl mb-4 shadow-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Full Name</label>
                  <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ahmed Hassan" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#ec4899] focus:border-transparent outline-none bg-white/80 backdrop-blur-sm transition hover:bg-white" required /></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">I am a...</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setForm({ ...form, userType: 'student' })} className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-bold transition-all ${form.userType === 'student' ? 'border-[#ec4899] bg-gradient-to-br from-pink-50 to-purple-50 text-[#db2777] shadow-sm' : 'border-gray-200 bg-white/50 text-gray-600 hover:border-pink-200 hover:bg-pink-50/30'}`}><GraduationCap className="w-4 h-4" /> Student</button>
                    <button type="button" onClick={() => setForm({ ...form, userType: 'mentor' })} className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-bold transition-all ${form.userType === 'mentor' ? 'border-[#ec4899] bg-gradient-to-br from-pink-50 to-purple-50 text-[#db2777] shadow-sm' : 'border-gray-200 bg-white/50 text-gray-600 hover:border-pink-200 hover:bg-pink-50/30'}`}><UserCheck className="w-4 h-4" /> Mentor</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">{form.userType === 'student' ? 'Grade' : 'Academic Level'}</label>
                  <div className="relative"><GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#ec4899] focus:border-transparent outline-none bg-white/80 backdrop-blur-sm appearance-none text-gray-700 hover:bg-white transition"><option value="">Select...</option><option value="9">Grade 9</option><option value="10">Grade 10</option><option value="11">Grade 11</option><option value="12">Grade 12</option><option value="Undergraduate">Undergraduate</option><option value="Other">Other</option></select></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Phone Number</label>
                  <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +20 100 123 4567" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#ec4899] focus:border-transparent outline-none bg-white/80 backdrop-blur-sm transition hover:bg-white" /></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Organization</label>
                  <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="e.g. Cairo University" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#ec4899] focus:border-transparent outline-none bg-white/80 backdrop-blur-sm transition hover:bg-white" /></div>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Email</label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="student@school.edu.eg" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#ec4899] focus:border-transparent outline-none bg-white/80 backdrop-blur-sm transition hover:bg-white" required /></div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Password</label>
              <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type={showPw ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 characters" className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#ec4899] focus:border-transparent outline-none bg-white/80 backdrop-blur-sm transition hover:bg-white" required minLength={6} /><button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Confirm Password</label>
                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type={showConfirmPw ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Repeat your password" className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#ec4899] focus:border-transparent outline-none bg-white/80 backdrop-blur-sm transition hover:bg-white" required minLength={6} /><button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">{showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl text-base font-black text-white bg-gradient-to-r from-[#ec4899] to-[#a855f7] hover:shadow-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-pink-200/50">
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-6">
            {mode === 'login' ? (<>Don&apos;t have an account? <button onClick={() => { setMode('register'); setError(''); }} className="text-[#ec4899] hover:text-[#db2777] font-semibold">Register</button></>) : (<>Already have an account? <button onClick={() => { setMode('login'); setError(''); }} className="text-blue-500 hover:text-blue-600 font-semibold">Sign In</button></>)}
          </p>
        </div>
      </div>
    </div>
  );
}
