"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Upload, FileText, X, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function DocumentManager({ installationId, canUpload }: { installationId: string, canUpload: boolean }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadDocuments();
  }, [installationId]);

  const loadDocuments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('installation_documents')
      .select('*')
      .eq('installation_id', installationId)
      .is('deleted_at', null);
      
    if (data) {
      // Create signed urls
      const withUrls = await Promise.all(data.map(async (doc) => {
        const { data: urlData } = await supabase.storage
          .from('installation-documents')
          .createSignedUrl(doc.storage_path, 3600);
        return { ...doc, url: urlData?.signedUrl };
      }));
      setDocuments(withUrls);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${installationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('installation-documents')
        .upload(filePath, file, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('installation_documents')
        .insert({
          installation_id: installationId,
          uploaded_by: user.id,
          file_name: file.name,
          storage_path: filePath,
          file_type: file.type,
          file_size: file.size
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully');
      loadDocuments();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      e.target.value = ''; // reset
    }
  };

  const handleDelete = async (doc: any) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    // Soft delete from DB
    const { error: dbError } = await supabase
      .from('installation_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', doc.id);
      
    if (dbError) {
      toast.error('Failed to delete from database');
      return;
    }
    
    // Actually we could leave it in storage since it's soft-deleted in DB, 
    // or we can remove it from storage. Let's just rely on the DB soft-delete 
    // to hide it, and we don't try to delete from storage if policy blocks.
    
    toast.success('Document deleted');
    loadDocuments();
  };

  if (loading) return <div className="text-sm text-gray-500 py-2">Loading documents...</div>;

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Documents (PDF)</h4>
        {canUpload && (
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#243B36]/10 hover:bg-[#243B36]/20 text-[#243B36] text-xs font-semibold rounded-md transition-colors">
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {uploading ? 'Uploading...' : 'Upload PDF'}
            <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="text-center p-4 border border-dashed rounded-lg bg-gray-50 text-gray-500 text-sm">
          No documents uploaded yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {documents.map(doc => (
            <li key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm hover:shadow transition-shadow">
              <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 flex-1 min-w-0 group">
                <div className="bg-red-50 p-2 rounded text-red-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">{doc.file_name}</p>
                  <p className="text-xs text-gray-500">{(doc.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                </div>
              </a>
              {canUpload && (
                <button 
                  onClick={() => handleDelete(doc)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ml-2"
                  title="Delete Document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
