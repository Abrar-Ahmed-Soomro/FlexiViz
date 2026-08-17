'use client';

import { useState } from 'react';
import { Link as LinkIcon, Loader2 } from 'lucide-react';

interface LinkImportProps {
  onImport: (url: string) => Promise<void>;
  loading?: boolean;
}

export default function LinkImport({ onImport, loading }: LinkImportProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    await onImport(url);
    setUrl('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <LinkIcon className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste link to Excel/CSV file..."
          required
          disabled={loading}
          className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:opacity-50"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          'Import'
        )}
      </button>
    </form>
  );
}
