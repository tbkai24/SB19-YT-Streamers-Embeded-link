'use client';

import React, { useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

interface ImageUploadInputProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  placeholder?: string;
}

export function ImageUploadInput({
  label,
  value,
  onChange,
  folder = 'SB19/profiles',
  placeholder = 'Upload image or paste URL...',
}: ImageUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);
    setProgress(5);
    setFileDetails({ name: file.name, size: formatFileSize(file.size) });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-image');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.min(95, Math.round((event.loaded / event.total) * 100));
        setProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.url) {
            setProgress(100);
            setTimeout(() => {
              onChange(data.url);
              setUploading(false);
              setProgress(0);
            }, 300);
            return;
          }
        } catch {
          // Ignore
        }
      }
      try {
        const data = JSON.parse(xhr.responseText);
        setError(data.error || 'Failed to upload image');
      } catch {
        setError('Server upload error');
      }
      setUploading(false);
      setProgress(0);
    };

    xhr.onerror = () => {
      setError('Network error during upload');
      setUploading(false);
      setProgress(0);
    };

    xhr.send(formData);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
          <ImageIcon className="w-3.5 h-3.5 text-rose-600" />
          <span>{label}</span>
          <span className="text-[10px] font-bold text-slate-400 normal-case ml-1">(Optional)</span>
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showUrlInput ? 'Switch to Upload' : 'Paste Image URL'}</span>
        </button>
      </div>

      {value ? (
        <div className="relative group rounded-2xl border border-slate-200 bg-white overflow-hidden p-2 flex items-center gap-3 shadow-xs">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
              <span>Image Uploaded Successfully</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-[11px] text-slate-500 truncate font-mono mt-0.5">{value}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange('');
              setFileDetails(null);
            }}
            className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : showUrlInput ? (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-500/10 font-medium transition-all shadow-xs"
        />
      ) : uploading ? (
        <div className="p-3.5 border border-rose-200 bg-rose-50/40 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900">
            <div className="flex items-center gap-2 truncate">
              <Loader2 className="w-4 h-4 text-rose-600 animate-spin shrink-0" />
              <span className="truncate">{fileDetails?.name || 'Uploading image...'}</span>
              {fileDetails?.size && (
                <span className="text-[10px] text-slate-500 font-semibold">({fileDetails.size})</span>
              )}
            </div>
            <span className="text-rose-600 font-black text-xs shrink-0 ml-2">{progress}%</span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-rose-600 to-red-600 h-2 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <label className="relative flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-rose-400 bg-slate-50/50 hover:bg-rose-50/30 rounded-2xl cursor-pointer transition-all group">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex items-center gap-2 text-slate-600 group-hover:text-rose-600 text-xs font-semibold">
            <Upload className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Click to upload picture (PNG, JPG, WebP)</span>
          </div>
        </label>
      )}

      {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
    </div>
  );
}
