/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, FormEvent } from "react";
import { auth, googleProvider, db } from "./lib/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  LogOut, 
  Instagram, 
  Calendar, 
  Clock, 
  RefreshCw, 
  Send,
  Zap,
  TrendingUp,
  Layout,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";

interface Campaign {
  id: string;
  idea: string;
  tone: string;
  targetAudience: string;
  status: string;
  createdAt: any;
  instagramPostId?: string;
  generatedCaption?: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [idea, setIdea] = useState("");
  const [tone, setTone] = useState("funny");
  const [audience, setAudience] = useState("");
  const [frequency, setFrequency] = useState("2 per day");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "campaigns"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
      setCampaigns(data);
    });
    return unsubscribe;
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          idea,
          tone,
          audience,
          frequency,
          preferredHours: ["09:00", "18:00"]
        })
      });

      if (res.ok) {
        setIsCreating(false);
        setIdea("");
        setAudience("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerCron = async () => {
    const secret = prompt("Enter CRON_SECRET to trigger post sync:");
    if (!secret) return;
    
    try {
      const res = await fetch("/api/cron/post", {
        method: "POST",
        headers: { "Authorization": `Bearer ${secret}` }
      });
      const data = await res.json();
      alert(`Cron result: ${JSON.stringify(data)}`);
    } catch (err) {
      alert("Failed to trigger cron");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
              <Zap className="w-12 h-12 text-indigo-400" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Kuan Influencer</h1>
            <p className="text-slate-400 text-lg">Automate your social presence with AI-driven content generation and scheduling.</p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20"
          >
            <Send className="w-5 h-5" />
            Get Started with Google
          </button>
          <p className="text-slate-500 text-sm italic">Connect your AI manager to Instagram in minutes.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-500" />
            <span className="font-bold text-xl tracking-tight">Kuan AI</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={triggerCron}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Test Cron Handler"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-slate-800" />
            <div className="flex items-center gap-3">
              <img 
                src={user.photoURL || ""} 
                alt={user.displayName || ""} 
                className="w-8 h-8 rounded-full ring-2 ring-indigo-500/20"
              />
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 pt-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            icon={<Layout className="w-5 h-5 text-indigo-400" />}
            label="Active Campaigns"
            value={campaigns.filter(c => c.status === 'scheduled').length.toString()}
          />
          <StatCard 
            icon={<Instagram className="w-5 h-5 text-pink-400" />}
            label="Total Posts"
            value={campaigns.filter(c => c.status === 'posted').length.toString()}
          />
          <StatCard 
            icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
            label="Engagement Rate"
            value="Coming Soon"
          />
        </div>

        {/* Campaign List Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Your Campaigns</h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-all"
          >
            <Plus className="w-5 h-5" />
            New Campaign
          </button>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {campaigns.map((campaign) => (
              <motion.div
                key={campaign.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/30 transition-colors group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1 group-hover:text-indigo-400 transition-colors">
                      {campaign.idea}
                    </h3>
                    <div className="flex gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        7 Days Active
                      </span>
                      <span className="flex items-center gap-1 uppercase">
                        <Clock className="w-4 h-4" />
                        {campaign.tone}
                      </span>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    campaign.status === 'posted' ? 'bg-emerald-500/10 text-emerald-400' : 
                    campaign.status === 'failed' ? 'bg-red-500/10 text-red-400' : 
                    'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    {campaign.status}
                  </div>
                </div>

                {campaign.generatedCaption && (
                  <div className="bg-slate-950/50 rounded-xl p-4 mb-4 border border-slate-800">
                    <p className="text-sm text-slate-300 line-clamp-3 italic">
                      "{campaign.generatedCaption}"
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-slate-500">Auto-generation active</span>
                  </div>
                  {campaign.instagramPostId && (
                    <a 
                      href={`https://instagram.com/p/${campaign.instagramPostId}`}
                      target="_blank"
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      View on Instagram
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {campaigns.length === 0 && (
            <div className="lg:col-span-2 py-20 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-500">
              <Calendar className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg">No campaigns yet. Launch your first one!</p>
            </div>
          )}
        </div>
      </main>

      {/* New Campaign Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Zap className="w-6 h-6 text-indigo-500" />
                Launch New Campaign
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Campaign Idea / Core Concept</label>
                  <textarea 
                    required
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="e.g. Daily travel tips for digital nomads in Southeast Asia..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all h-24 resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Voice Tone</label>
                    <select 
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="funny">Funny & Casual</option>
                      <option value="professional">Professional</option>
                      <option value="inspirational">Inspirational</option>
                      <option value="brutalist">Brutalist / Direct</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Frequency</label>
                    <select 
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="1 per day">1 Post / Day</option>
                      <option value="2 per day">2 Posts / Day</option>
                      <option value="3 per day">3 Posts / Day</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Target Audience</label>
                  <input 
                    type="text"
                    required
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="e.g. Gen Z Founders, Coffee Enthusiasts..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Automating"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
      <div className="p-3 bg-slate-950 rounded-xl">
        {icon}
      </div>
      <div>
        <div className="text-slate-400 text-sm font-medium">{label}</div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
