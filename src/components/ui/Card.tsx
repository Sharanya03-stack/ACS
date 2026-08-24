'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white dark:bg-[#1C211F] shadow-sm border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-800 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-[#243B36] dark:text-[#F5F3ED] ${className}`}>{children}</h3>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 dark:text-gray-300 ${className}`}>{children}</div>;
}
