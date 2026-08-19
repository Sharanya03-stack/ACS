"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BatteryCharging, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

import Image from "next/image";

// Mapped emails for the fake "user ID" dropdown to match the real seeded auth DB
const EMAIL_MAP: Record<string, string> = {
  admin001: 'admin@acsenergy.com',
  oem001: 'oem@tata.com',
  dealer001: 'dealer@tata.com',
  partner001: 'partner@voltcharge.com',
  tech001: 'tech@voltcharge.com',
};

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDemoSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId && EMAIL_MAP[selectedId]) {
      setUserId(EMAIL_MAP[selectedId]);
      setPassword("password123"); 
    } else {
      setUserId("");
      setPassword("");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // For backwards compatibility with the UI, if they type 'admin001', map it. Otherwise use the typed email.
      const emailToUse = EMAIL_MAP[userId] || userId;

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsSubmitting(false);
        return;
      }

      // We rely on middleware or AuthContext to route, but we can do an initial fetch here for smooth UX
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      
      const role = profile?.role;
      if (role === 'ACS_ADMIN') router.push("/admin/dashboard");
      else if (role === 'OEM') router.push("/oem/dashboard");
      else if (role === 'DEALER') router.push("/dealer/dashboard");
      else if (role === 'PARTNER') router.push("/partner/dashboard");
      else if (role === 'TECHNICIAN') router.push("/technician/dashboard");
      else router.push("/");
      
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C211F] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor - Cinematic Image */}
      <motion.div 
        className="absolute inset-0 z-0 pointer-events-none"
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 15, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
      >
        <Image
          src="/images/login-bg.jpg"
          alt="EV Charging Station"
          fill
          className="object-cover opacity-70"
          priority
        />
        {/* Dark Gradient Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C211F] via-[#1C211F]/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#1C211F]/90 via-transparent to-[#1C211F]/90"></div>
      </motion.div>
      
      {/* Subtle Animated Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-[#D6A84F]/10 rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-[40%] -right-[10%] w-[30%] h-[50%] bg-[#243B36]/20 rounded-full blur-3xl animate-[pulse_10s_ease-in-out_infinite_reverse]" />
        
        <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFFFFF" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gridPattern)" />
        </svg>
      </div>
      
      {/* Floating Badges */}
      <motion.div 
        animate={{ y: [0, -15, 0] }} 
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="hidden lg:flex absolute top-1/4 left-[10%] bg-white/80 backdrop-blur border border-white p-3 rounded-2xl shadow-xl items-center gap-3 pointer-events-none z-10"
      >
        <div className="bg-[#243B36]/10 p-2 rounded-full text-[#243B36]"><BatteryCharging size={24} /></div>
        <div className="font-semibold text-sm text-[#243B36]">EV Charging<br/><span className="font-normal text-xs text-gray-500">Platform Online</span></div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, 15, 0] }} 
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="hidden lg:flex absolute bottom-1/4 right-[10%] bg-white/80 backdrop-blur border border-white p-3 rounded-2xl shadow-xl items-center gap-3 pointer-events-none z-10"
      >
        <div className="bg-[#D6A84F]/20 p-2 rounded-full text-[#c59844]"><ShieldCheck size={24} /></div>
        <div className="font-semibold text-sm text-[#243B36]">Secure Enterprise<br/><span className="font-normal text-xs text-gray-500">Access verified</span></div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, 10, 0] }} 
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="hidden lg:flex absolute top-1/3 right-[12%] bg-white/80 backdrop-blur border border-white p-3 rounded-2xl shadow-xl items-center gap-3 pointer-events-none z-10"
      >
        <div className="bg-blue-50 p-2 rounded-full text-blue-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <div className="font-semibold text-sm text-[#243B36]">Fast Install<br/><span className="font-normal text-xs text-gray-500">Optimized Workflow</span></div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, -12, 0] }} 
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="hidden lg:flex absolute bottom-1/3 left-[12%] bg-white/80 backdrop-blur border border-white p-3 rounded-2xl shadow-xl items-center gap-3 pointer-events-none z-10"
      >
        <div className="bg-green-50 p-2 rounded-full text-green-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div className="font-semibold text-sm text-[#243B36]">Quality Assured<br/><span className="font-normal text-xs text-gray-500">10-Point Checklist</span></div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <h1 className="text-center text-4xl font-extrabold tracking-tight text-[#243B36]">
          ACS ENERGY
        </h1>
        <h2 className="mt-2 text-center text-sm font-medium text-gray-600 uppercase tracking-widest">
          EV Charger Installation Platform
        </h2>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white/90 backdrop-blur py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white">
          
          <div className="mb-6 p-4 bg-gray-50/80 border border-gray-100 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Supabase Auth Integrated</h3>
            <p className="text-xs text-gray-600 mb-4">Select a role below to auto-fill the test email and password.</p>
            <select 
              className="w-full text-sm border-gray-200 rounded-lg shadow-sm focus:border-[#D6A84F] focus:ring-[#D6A84F] bg-white p-2.5 border outline-none transition-all"
              onChange={handleDemoSelect}
              defaultValue=""
            >
              <option value="" disabled>Auto-fill test credentials...</option>
              <option value="admin001">ACS Admin (admin@acsenergy.com)</option>
              <option value="oem001">OEM (oem@tata.com)</option>
              <option value="dealer001">Dealer (dealer@tata.com)</option>
              <option value="partner001">Installation Partner (partner@voltcharge.com)</option>
              <option value="tech001">Technician (tech@voltcharge.com)</option>
            </select>
            <p className="text-[10px] text-gray-400 mt-2 text-center">Passwords are password123</p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                Email / User ID
              </label>
              <div className="mt-1">
                <input
                  id="userId"
                  name="userId"
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-400 shadow-sm focus:border-[#243B36] focus:outline-none focus:ring-1 focus:ring-[#243B36] sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-400 shadow-sm focus:border-[#243B36] focus:outline-none focus:ring-1 focus:ring-[#243B36] sm:text-sm transition-colors"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100"
              >
                {error}
              </motion.div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-[#243B36] to-[#1a2b27] hover:from-[#1a2b27] hover:to-[#111c19] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#243B36] transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
              >
                {isSubmitting ? "Authenticating..." : "Sign in securely"}
              </button>
            </div>
          </form>
          
          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-500">Secure Enterprise Portal • v2.0</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
