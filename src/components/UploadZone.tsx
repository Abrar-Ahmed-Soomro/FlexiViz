'use client';

import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  loading?: boolean;
}

export default function UploadZone({ onUpload, loading }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  }, [onUpload]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  }, [onUpload]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        dragActive
          ? 'border-slate-900 bg-slate-50'
          : 'border-slate-300 hover:border-slate-400'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        id="file-upload"
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleChange}
        disabled={loading}
        className="hidden"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            dragActive ? 'bg-slate-200' : 'bg-slate-100'
          }`}>
            {loading ? (
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className={`w-6 h-6 ${dragActive ? 'text-slate-900' : 'text-slate-500'}`} />
            )}
          </div>
          <p className="text-sm font-medium text-slate-900">
            {loading ? 'Uploading...' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Excel (.xlsx, .xls) or CSV files
          </p>
        </div>
      </label>
    </div>
  );
}
