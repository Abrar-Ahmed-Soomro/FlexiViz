'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import UploadZone from '@/components/UploadZone';
import LinkImport from '@/components/LinkImport';
import { FileSpreadsheet, Trash2, BarChart3, Share2 } from 'lucide-react';

interface Dataset {
  _id: string;
  fileName: string;
  sourceType: 'upload' | 'link';
  rowCount: number;
  createdAt: string;
  isPublic?: boolean;
  publicSlug?: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchDatasets = async () => {
    try {
      const res = await fetch('/api/datasets');
      if (res.ok) {
        const data = await res.json();
        setDatasets(data.datasets);
      }
    } catch (err) {
      console.error('Failed to fetch datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect -- Data fetching on user/auth change is a legitimate useEffect use case */
  useEffect(() => {
    if (user) {
      fetchDatasets();
    }
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      await fetchDatasets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleLinkImport = async (url: string) => {
    setImporting(true);
    setError('');
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Import failed');
      }
      
      await fetchDatasets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;

    try {
      const res = await fetch(`/api/datasets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDatasets(datasets.filter(d => d._id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const togglePublic = async (id: string, currentPublic: boolean) => {
    try {
      const res = await fetch(`/api/datasets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !currentPublic }),
      });

      if (res.ok) {
        const data = await res.json();
        setDatasets(datasets.map(d => d._id === id ? { ...d, isPublic: data.dataset.isPublic, publicSlug: data.dataset.publicSlug } : d));
      }
    } catch (err) {
      console.error('Toggle public failed:', err);
    }
  };

  const copyPublicLink = (slug: string) => {
    const link = `${window.location.origin}/public/${slug}`;
    navigator.clipboard.writeText(link);
    alert('Public link copied to clipboard!');
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">Manage your datasets and create visualizations</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Upload File</h2>
            <UploadZone onUpload={handleUpload} loading={uploading} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Import from Link</h2>
            <LinkImport onImport={handleLinkImport} loading={importing} />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Datasets</h2>
          {datasets.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No datasets yet. Upload or import a file to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {datasets.map((dataset) => (
                <div
                  key={dataset._id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{dataset.fileName}</p>
                      <p className="text-sm text-slate-500">
                        {dataset.rowCount.toLocaleString()} rows • {new Date(dataset.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => router.push(`/dashboard/${dataset._id}`)}
                      className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                      title="Build chart"
                    >
                      <BarChart3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => togglePublic(dataset._id, dataset.isPublic || false)}
                      className={`inline-flex items-center justify-center p-2 rounded-md ${
                        dataset.isPublic
                          ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title={dataset.isPublic ? 'Make private' : 'Make public'}
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    {dataset.isPublic && dataset.publicSlug && (
                      <button
                        onClick={() => copyPublicLink(dataset.publicSlug!)}
                        className="inline-flex items-center justify-center p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                        title="Copy public link"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(dataset._id)}
                      className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
