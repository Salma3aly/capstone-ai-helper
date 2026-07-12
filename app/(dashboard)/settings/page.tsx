'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, Camera, User, Mail, Phone, GraduationCap, Building2 } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

export default function SettingsPage() {
  const { user, signedIn } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    grade: '',
    phone: '',
    university: '',
  });

  useEffect(() => {
    if (!signedIn) { router.replace('/'); return; }
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        grade: user.grade || '',
        phone: user.phone || '',
        university: user.university || '',
      });
    }
    const stored = localStorage.getItem('capstone_avatar');
    if (stored) setAvatar(stored);
  }, [user, signedIn, router]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      if (avatar) localStorage.setItem('capstone_avatar', avatar);
      const token = localStorage.getItem('capstone_token');
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, avatar }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      localStorage.setItem('capstone_user', JSON.stringify(data.user));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#0f172a]">Settings</h1>

      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[#ec4899] flex items-center justify-center overflow-hidden shadow-md">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {form.name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-[#e2e8f0] shadow-sm flex items-center justify-center hover:bg-[#f8fafc] transition"
            >
              <Camera className="w-4 h-4 text-[#64748b]" />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          {avatar && (
            <button onClick={() => setAvatar(null)} className="text-xs text-red-500 hover:text-red-600">
              Remove picture
            </button>
          )}
          <p className="text-xs text-[#64748b]">Click the camera icon to upload a profile picture</p>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-[#0f172a]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-[#0f172a]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1">Grade / Academic Level</label>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <select
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-[#0f172a] bg-white appearance-none"
              >
                <option value="">Select academic level...</option>
                <option value="High School">High School</option>
                <option value="Freshman">Freshman (1st Year)</option>
                <option value="Sophomore">Sophomore (2nd Year)</option>
                <option value="Junior">Junior (3rd Year)</option>
                <option value="Senior">Senior (4th Year)</option>
                <option value="Graduate">Graduate / Master&apos;s</option>
                <option value="PhD">PhD / Doctoral</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                type="tel" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. +20 100 123 4567"
                className="w-full pl-10 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-[#0f172a]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1">University / Institution</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                type="text" value={form.university}
                onChange={(e) => setForm({ ...form, university: e.target.value })}
                placeholder="e.g. Cairo University"
                className="w-full pl-10 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ec4899] text-[#0f172a]"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-white bg-[#ec4899] hover:bg-[#db2777] disabled:bg-[#94a3b8] transition shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
