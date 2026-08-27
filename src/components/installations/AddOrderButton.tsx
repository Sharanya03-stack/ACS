"use client";

import React, { useState } from 'react';
import { AddOrderModal } from './AddOrderModal';
import { Plus } from 'lucide-react';

export function AddOrderButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 justify-center rounded-md border border-transparent bg-acs-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-acs-primary/90"
      >
        <Plus className="h-4 w-4" /> Add Order
      </button>
      <AddOrderModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
