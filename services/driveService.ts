
import { UploadedFile } from '../types';

/**
 * Service to handle file uploads to Google Drive via a Google Apps Script proxy.
 */

const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwDpwTmdiaDLww8BJHy664SIK5gXcahZhF7dIDaGzRkbnp8vzh0XJ7f9etG1SpXj29s/exec";
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;

export interface DriveUploadResponse {
  status: 'success' | 'error';
  fileUrl?: string;
  fileId?: string;
  message?: string;
}

/**
 * Converts a File object to a Base64 string.
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

/**
 * Uploads a file to Google Drive using the provided Apps Script URL.
 */
export async function uploadToDrive(file: File | { name: string, type: string, base64: string }): Promise<DriveUploadResponse> {
  try {
    let base64: string;
    let fileName: string;
    let mimeType: string;

    if (file instanceof File) {
      base64 = await fileToBase64(file);
      fileName = file.name;
      mimeType = file.type;
    } else {
      base64 = file.base64;
      fileName = file.name;
      mimeType = file.type;
    }

    // Apps Script expects the base64 data without the prefix (e.g., "data:image/png;base64,")
    const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
    
    // We use URLSearchParams as it's the most compatible with Google Apps Script's doPost/e.parameter
    const params = new URLSearchParams();
    params.append("file", base64Data);
    params.append("fileName", fileName);
    params.append("mimeType", mimeType);

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "cors", // Explicitly set mode
      cache: "no-cache",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(), // Convert to string explicitly
    });

    if (!res.ok) {
      throw new Error(`Upload failed with status: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error uploading to Drive:", error);
    
    let message = "Unknown upload error";
    if (error instanceof Error) {
      message = error.message;
      if (message === "Failed to fetch") {
        message = "Failed to fetch: This is likely a CORS issue or the Apps Script is not shared correctly. Please ensure the Apps Script is deployed as a Web App, executed as 'Me', and accessible by 'Anyone'.";
      }
    }

    return {
      status: 'error',
      message: message
    };
  }
}

/**
 * Helper to upload a file and return a full UploadedFile object.
 */
export async function uploadAndCreateFileObject(file: File, existingDataUrl?: string): Promise<UploadedFile> {
  const dataUrl = existingDataUrl || await fileToBase64(file);
  const driveResponse = await uploadToDrive(file);
  
  return {
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    dataUrl: dataUrl,
    driveUrl: driveResponse.status === 'success' ? driveResponse.fileUrl : undefined,
    driveId: driveResponse.status === 'success' ? driveResponse.fileId : undefined,
  };
}
