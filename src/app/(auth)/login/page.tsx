"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BatteryCharging, ShieldCheck, Mail, Smartphone, ArrowRight } from "lucide-react";
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
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  
  // Email states
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  
  // Phone states
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  // Common states
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDemoSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId && EMAIL_MAP[selectedId]) {
      setUserId(EMAIL_MAP[selectedId]);
      setPassword("password123"); 
      setLoginMethod('email');
    } else {
      setUserId("");
      setPassword("");
    }
  };
  
  const routeUserByRole = async (userId: string) => {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    const role = profile?.role;
    if (role === 'ACS_ADMIN') router.push("/admin/dashboard");
    else if (role === 'OEM') router.push("/oem/dashboard");
    else if (role === 'DEALER') router.push("/dealer/dashboard");
    else if (role === 'PARTNER') router.push("/partner/dashboard");
    else if (role === 'TECHNICIAN') router.push("/technician/dashboard");
    else router.push("/");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const emailToUse = EMAIL_MAP[userId] || userId;

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password,
      });

      if (signInError) throw signInError;
      await routeUserByRole(data.user.id);
      
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Format phone number to ensure it has a '+' sign if missing but otherwise rely on user input
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;
      
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (otpError) throw otpError;
      
      setShowOtpInput(true);
      setIsSubmitting(false);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;
      
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms'
      });

      if (verifyError) throw verifyError;
      if (data.user) {
        await routeUserByRole(data.user.id);
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor - Cinematic Image */}
      <motion.div 
        className="absolute inset-0 z-0 pointer-events-none"
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 15, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
      >
        
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
        className="hidden lg:flex absolute top-1/4 left-[10%] bg-white border border-gray-200 p-3 rounded-2xl shadow-xl items-center gap-3 pointer-events-none z-10"
      >
        <div className="bg-[#243B36]/10 p-2 rounded-full text-[#243B36]"><BatteryCharging size={24} /></div>
        <div className="font-semibold text-sm text-[#243B36]">EV Charging<br/><span className="font-normal text-xs text-gray-500">Platform Online</span></div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, 15, 0] }} 
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="hidden lg:flex absolute bottom-1/4 right-[10%] bg-white border border-gray-200 p-3 rounded-2xl shadow-xl items-center gap-3 pointer-events-none z-10"
      >
        <div className="bg-[#D6A84F]/20 p-2 rounded-full text-[#c59844]"><ShieldCheck size={24} /></div>
        <div className="font-semibold text-sm text-[#243B36]">Secure Enterprise<br/><span className="font-normal text-xs text-gray-500">Access verified</span></div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, 10, 0] }} 
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="hidden lg:flex absolute top-1/3 right-[12%] bg-white border border-gray-200 p-3 rounded-2xl shadow-xl items-center gap-3 pointer-events-none z-10"
      >
        <div className="bg-blue-50 p-2 rounded-full text-blue-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <div className="font-semibold text-sm text-[#243B36]">Fast Install<br/><span className="font-normal text-xs text-gray-500">Optimized Workflow</span></div>
      </motion.div>

      <motion.div 
        animate={{ y: [0, -12, 0] }} 
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="hidden lg:flex absolute bottom-1/3 left-[12%] bg-white border border-gray-200 p-3 rounded-2xl shadow-xl items-center gap-3 pointer-events-none z-10"
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
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="ACS ENERGY Logo" width={220} height={60} className="mx-auto drop-shadow-sm" />
          </div>
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
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-gray-100">
          
                    <div className="mb-6">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                  loginMethod === 'email' 
                    ? 'bg-white text-[#243B36] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail className="h-4 w-4" /> Email
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                  loginMethod === 'phone' 
                    ? 'bg-white text-[#243B36] shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Smartphone className="h-4 w-4" /> Phone OTP
              </button>
            </div>
          </div>

          {loginMethod === 'email' && (
            <div className="mb-6 p-4 bg-gray-50/80 border border-gray-100 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">Demo Access</h3>
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
            </div>
          )}

          {loginMethod === 'email' ? (
            <form className="space-y-6" onSubmit={handleEmailLogin}>
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
          ) : (
            <form className="space-y-6" onSubmit={showOtpInput ? handleVerifyOtp : handleSendOtp}>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1234567890"
                    required
                    disabled={showOtpInput}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full appearance-none rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-400 shadow-sm focus:border-[#243B36] focus:outline-none focus:ring-1 focus:ring-[#243B36] sm:text-sm transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>

              {showOtpInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                    Verification Code (OTP)
                  </label>
                  <div className="mt-1">
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="block w-full appearance-none rounded-lg border border-gray-300 px-4 py-3 placeholder-gray-400 shadow-sm focus:border-[#243B36] focus:outline-none focus:ring-1 focus:ring-[#243B36] sm:text-sm transition-colors tracking-widest text-center text-lg font-mono"
                      placeholder="••••••"
                    />
                  </div>
                </motion.div>
              )}

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
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-[#243B36] to-[#1a2b27] hover:from-[#1a2b27] hover:to-[#111c19] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#243B36] transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
                >
                  {isSubmitting 
                    ? "Processing..." 
                    : showOtpInput 
                      ? "Verify & Sign In" 
                      : <>Send OTP <ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
              
              {showOtpInput && (
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpInput(false);
                      setOtp("");
                      setError("");
                    }}
                    className="text-xs text-[#243B36] hover:underline font-medium"
                  >
                    Change phone number
                  </button>
                </div>
              )}
            </form>
          )}
          
          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-500">Secure Enterprise Portal • v2.0</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

