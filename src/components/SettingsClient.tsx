"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Lock, Shield, Mail, Smartphone, Key } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function SettingsClient() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('notifications');
  const [isSaving, setIsSaving] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState([
    { id: 'email', title: "Email Notifications", desc: "Receive emails about new job assignments and status changes.", icon: Mail, on: true },
    { id: 'sms', title: "SMS Alerts", desc: "Get text messages for critical alerts and OTP verifications.", icon: Smartphone, on: true },
    { id: 'system', title: "System Broadcasts", desc: "Receive alerts regarding ACS Energy platform maintenance.", icon: Bell, on: false }
  ]);

  // Security State
  const [passwords, setPasswords] = useState({
    current: '',
    new: ''
  });

  const toggleNotification = (index: number) => {
    const newNotifs = [...notifications];
    newNotifs[index].on = !newNotifs[index].on;
    setNotifications(newNotifs);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setPasswords({ current: '', new: '' });
      toast.success('Settings saved successfully', {
        style: {
          background: '#243B36',
          color: '#fff',
          fontWeight: '500'
        },
        iconTheme: {
          primary: '#D6A84F',
          secondary: '#243B36',
        }
      });
    }, 800);
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'account', label: 'Account', icon: Shield },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative">

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-sm text-gray-600">Manage your account preferences and security.</p>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#243B36] text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${activeTab === tab.id ? 'text-[#D6A84F]' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">

          {activeTab === 'notifications' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8"
            >
              <h2 className="text-xl font-semibold mb-6 pb-4 border-b border-gray-100">Notification Preferences</h2>
              <div className="space-y-6">
                {notifications.map((item, i) => (
                  <div key={i} className="flex items-start justify-between py-4 border-b border-gray-50 last:border-0">
                    <div className="flex gap-4">
                      <div className={`p-2 rounded-lg ${item.on ? 'bg-[#243B36]/10 text-[#243B36]' : 'bg-gray-100 text-gray-400'}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleNotification(i)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${item.on ? 'bg-[#243B36]' : 'bg-gray-200'}`}
                    >
                      <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.on ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8"
            >
              <h2 className="text-xl font-semibold mb-6 pb-4 border-b border-gray-100">Security Settings</h2>
              <div className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Password</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-4 w-4 text-gray-400" />
                    </div>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={passwords.current}
                      onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                      className="focus:ring-[#243B36] focus:border-[#243B36] block w-full pl-10 sm:text-sm border-gray-300 rounded-md h-10 border" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password</label>
                  <input 
                    type="password" 
                    placeholder="Leave blank to keep same" 
                    value={passwords.new}
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#243B36] focus:ring-[#243B36] sm:text-sm h-10 border px-3" 
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'account' && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8 flex flex-col items-center justify-center text-center h-full pt-16"
            >
              <Shield className="h-16 w-16 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Enterprise Account Management</h2>
              <p className="text-gray-500 max-w-md">Your account is managed by your organization's administrator. Contact ACS Support for role or capability changes.</p>
            </motion.div>
          )}

          {/* Action Footer */}
          <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 mt-auto">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-[#1C211F] bg-[#D6A84F] hover:bg-[#c59844] rounded-md transition-colors flex items-center gap-2 min-w-[100px] justify-center"
            >
              {isSaving ? (
                <div className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
