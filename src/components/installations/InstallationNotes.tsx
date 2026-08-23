"use client";

import React, { useState, useEffect } from 'react';
import { getInstallationNotes, addInstallationNote } from '@/app/actions/installationNotes';
import { MessageSquare, User, Clock, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface InstallationNotesProps {
  installationId: string;
}

export function InstallationNotes({ installationId }: InstallationNotesProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (installationId) {
      loadNotes();
    }
  }, [installationId]);

  const loadNotes = async () => {
    setLoading(true);
    const res = await getInstallationNotes(installationId);
    if (res.success) {
      setNotes(res.data);
    } else {
      toast.error(res.error || 'Failed to load notes');
    }
    setLoading(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    const res = await addInstallationNote(installationId, newNote);
    if (res.success) {
      setNewNote('');
      await loadNotes();
      toast.success('Note added');
    } else {
      toast.error(res.error || 'Failed to add note');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="border-t pt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-gray-500" /> Notes
      </h3>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        
        {/* Note Input */}
        <form onSubmit={handleAddNote} className="mb-6">
          <label htmlFor="note" className="sr-only">Add a note</label>
          <div className="relative">
            <textarea
              id="note"
              rows={3}
              className="block w-full rounded-md border border-gray-300 p-3 text-sm focus:border-acs-primary focus:ring-acs-primary shadow-sm"
              placeholder="Add a note about this installation..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="absolute bottom-2 right-2">
              <button
                type="submit"
                disabled={isSubmitting || !newNote.trim()}
                className="inline-flex items-center gap-1 bg-[#243B36] text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[#1b2e2a] disabled:opacity-50 transition-colors"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Posting...' : 'Post Note'}
              </button>
            </div>
          </div>
        </form>

        {/* Notes List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-4 text-sm text-gray-500">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500 bg-white rounded-md border border-dashed border-gray-300">
              No notes yet. Be the first to leave a comment.
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {note.profiles?.name || 'Unknown User'} 
                      <span className="ml-2 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        {note.profiles?.role?.replace('_', ' ') || 'Unknown Role'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">{note.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
