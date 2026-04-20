
import imageCompression from 'browser-image-compression';
import { UploadedFile } from '../types';
import { uploadToDrive } from './driveService';

/**
 * Service to handle file storage logic.
 * Priority 1: Firestore (Base64, compressed to < 1MB)
 * Priority 2: Google Drive (Backup if still too large)
 */

const MAX_FIRESTORE_SIZE_BYTES = 1000000; // 1MB limit

/**
 * Converts a File object to a Base64 string.
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

/**
 * Compresses an image file to be under a certain size.
 */
async function compressImage(file: File): Promise<File | Blob> {
  const options = {
    maxSizeMB: 0.7, // Target ~700KB to account for Base64 overhead
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    initialQuality: 0.6
  };

  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error("Image compression failed:", error);
    return file;
  }
}

/**
 * Processes a file for storage.
 * Tries to compress images and convert to Base64.
 * If the result is > 1MB, it uploads to Google Drive as a backup.
 */
export async function processFileForStorage(file: File): Promise<UploadedFile> {
  let processedFile: File | Blob = file;
  
  // 1. If it's an image, try to compress it first
  if (file.type.startsWith('image/')) {
    processedFile = await compressImage(file);
  }

  // 2. Convert to Base64
  let dataUrl = await fileToBase64(processedFile);
  
  // 3. Check size (Base64 string length is a good proxy for byte size)
  // Base64 is roughly 4/3 the size of the original binary
  const isTooLargeForFirestore = dataUrl.length > MAX_FIRESTORE_SIZE_BYTES;

  let driveUrl: string | undefined;
  let driveId: string | undefined;

  // 4. If still too large, or as a general backup (per user request: "google script method becomes the backup")
  // We'll always try to upload to Drive as a backup if it's a "heavy" file, 
  // but specifically if it's > 1MB it's mandatory.
  if (isTooLargeForFirestore || file.size > 500000) {
    try {
      const driveResponse = await uploadToDrive(file);
      if (driveResponse.status === 'success') {
        driveUrl = driveResponse.fileUrl;
        driveId = driveResponse.fileId;
      }
    } catch (error) {
      console.error("Backup Drive upload failed:", error);
    }
  }

  // If it's too large for Firestore, we MUST clear the dataUrl or use a placeholder
  // so the Firestore write doesn't fail.
  if (isTooLargeForFirestore) {
    // If we have a drive URL, we can safely clear the dataUrl to save space in Firestore
    if (driveUrl) {
      dataUrl = "DRIVE_ONLY"; // Placeholder indicating it's only on Drive
    } else {
      // If drive upload failed and it's too large, we have a problem.
      // We'll keep the dataUrl but it might fail on save.
      // Ideally, we'd show an error to the user here.
      console.warn("File is too large for Firestore and Drive upload failed.");
    }
  }

  return {
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    dataUrl: dataUrl,
    driveUrl: driveUrl,
    driveId: driveId,
  };
}
