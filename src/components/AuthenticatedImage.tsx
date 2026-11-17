import React, { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { auth } from '../lib/firebase';

interface Props {
  src: string;
  alt: string;
  className?: string;
}

export const AuthenticatedImage: React.FC<Props> = ({ src, alt, className = '' }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function load() {
      if (!src) {
        setFailed(true);
        return;
      }
      if (!src.startsWith('/api/screenshots/')) {
        setBlobUrl(src);
        return;
      }

      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          if (active) setFailed(true);
          return;
        }
        const res = await fetch(src, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (active) setFailed(true);
          return;
        }
        const blob = await res.blob();
        createdUrl = URL.createObjectURL(blob);
        if (active) {
          setBlobUrl(createdUrl);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    }

    load();
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [src]);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-500 p-4 ${className}`}
      >
        <ImageIcon className="w-6 h-6 mb-1.5 opacity-60" />
        <span className="text-xs font-medium text-center">{alt || 'Chart preview unavailable'}</span>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div
        className={`animate-pulse bg-slate-200 dark:bg-slate-800/70 ${className}`}
        aria-label="Loading chart image"
      />
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
};
