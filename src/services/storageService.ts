import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { auth, storage } from '../lib/firebase';
import type { ScreenshotStage } from '../types/domain';

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const FIREBASE_STORAGE_CONSOLE_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/storage`;

function hasValidMagicBytes(bytes: Uint8Array, mimeType: string): boolean {
  if (bytes.length < 12) return false;
  if (mimeType === 'image/png') {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (mimeType === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === 'image/webp') {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

export async function validateChartImageFile(file: File): Promise<void> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Unsupported file format. Upload PNG, JPEG, or WEBP images only.');
  }
  if (file.size <= 0 || file.size > MAX_SCREENSHOT_BYTES) {
    throw new Error('Image size must be between 1 byte and 5 MB.');
  }
  const headerSlice = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(headerSlice);
  if (!hasValidMagicBytes(bytes, file.type)) {
    throw new Error('File contents do not match a valid PNG, JPEG, or WEBP image.');
  }
}

export interface UploadedScreenshotAsset {
  imageUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageBackend: 'firebase_storage' | 'server_uploads';
}

function randomHex(length = 8): string {
  const arr = new Uint8Array(Math.ceil(length / 2));
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

/**
 * Uploads chart screenshot evidence to Firebase Storage under screenshots/{uid}/{storedName}.
 * Falls back to the Express /api/uploads/screenshot endpoint if Firebase Storage is not yet
 * initialized in Firebase Console and a Node backend is available.
 */
export async function uploadChartScreenshot(params: {
  file: File;
  userId: string;
  tradeId: string;
  stage: ScreenshotStage;
}): Promise<UploadedScreenshotAsset> {
  const { file, userId, tradeId, stage } = params;
  await validateChartImageFile(file);

  const safeUid = userId.replace(/[^a-zA-Z0-9_-]/g, '');
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const safeOriginalName = (file.name || `chart.${ext}`)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 140);
  const storedName = `${Date.now()}_${randomHex(8)}.${ext}`;
  const storagePath = `screenshots/${safeUid}/${storedName}`;

  try {
    const objectRef = ref(storage, storagePath);
    await uploadBytes(objectRef, file, {
      contentType: file.type,
      customMetadata: {
        userId: safeUid,
        tradeId: tradeId.slice(0, 128),
        stage,
        originalName: safeOriginalName,
      },
    });
    const downloadUrl = await getDownloadURL(objectRef);
    return {
      imageUrl: downloadUrl.slice(0, 500),
      fileName: safeOriginalName,
      mimeType: file.type,
      fileSize: file.size,
      storageBackend: 'firebase_storage',
    };
  } catch (storageErr: unknown) {
    // Fallback to server upload middleware when available (e.g., before Firebase Storage bucket setup)
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw storageErr;

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/uploads/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dataUrl,
          fileName: safeOriginalName,
          mimeType: file.type,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const payload = (await res.json()) as {
          imageUrl: string;
          fileName: string;
          mimeType: string;
          fileSize: number;
        };
        return {
          ...payload,
          storageBackend: 'server_uploads',
        };
      }
    } catch {
      // Ignore fallback error and report primary Firebase Storage guidance below
    }

    const code = (storageErr as { code?: string })?.code;
    if (
      code === 'storage/unauthorized' ||
      code === 'storage/bucket-not-found' ||
      code === 'storage/project-not-found' ||
      code === 'storage/unknown'
    ) {
      throw new Error(
        `Firebase Storage is not yet activated or authorized for bucket "${firebaseConfig.storageBucket}". Enable Storage in Firebase Console (${FIREBASE_STORAGE_CONSOLE_URL}) and apply storage.rules.`
      );
    }
    throw storageErr instanceof Error ? storageErr : new Error('Chart screenshot upload failed.');
  }
}

export function isFirebaseStorageUrl(url: string): boolean {
  return (
    url.startsWith('https://firebasestorage.googleapis.com/') ||
    url.startsWith('gs://')
  );
}

export async function deleteStoredChartScreenshot(imageUrl?: string): Promise<void> {
  if (!imageUrl) return;

  if (imageUrl.startsWith('/api/screenshots/')) {
    const token = await auth.currentUser?.getIdToken().catch(() => null);
    if (token) {
      await fetch(imageUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    return;
  }

  if (isFirebaseStorageUrl(imageUrl)) {
    try {
      await deleteObject(ref(storage, imageUrl));
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== 'storage/object-not-found') {
        console.warn('Unable to delete Firebase Storage object:', err);
      }
    }
  }
}
