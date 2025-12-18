/**
 * Plugin file storage using Vercel Blob
 */

import { put, del, list, head } from "@vercel/blob";
import { createHash } from "crypto";

const PLUGIN_FOLDER = "plugins";

export interface UploadResult {
  url: string;
  checksum: string;
  fileSize: number;
}

/**
 * Upload a plugin file to blob storage
 */
export async function uploadPluginFile(
  pluginId: string,
  version: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<UploadResult> {
  // Generate SHA256 checksum
  const checksum = createHash("sha256").update(fileBuffer).digest("hex");
  
  // Create path: plugins/{pluginId}/{version}/{fileName}
  const path = `${PLUGIN_FOLDER}/${pluginId}/${version}/${fileName}`;
  
  // Upload to Vercel Blob
  const blob = await put(path, fileBuffer, {
    access: "public",
    contentType: "application/zip",
    addRandomSuffix: false,
  });
  
  return {
    url: blob.url,
    checksum,
    fileSize: fileBuffer.length,
  };
}

/**
 * Upload a plugin icon
 */
export async function uploadPluginIcon(
  pluginId: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  const ext = contentType.split("/")[1] || "png";
  const path = `${PLUGIN_FOLDER}/${pluginId}/icon.${ext}`;
  
  const blob = await put(path, fileBuffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });
  
  return blob.url;
}

/**
 * Upload a plugin banner image
 */
export async function uploadPluginBanner(
  pluginId: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  const ext = contentType.split("/")[1] || "png";
  const path = `${PLUGIN_FOLDER}/${pluginId}/banner.${ext}`;
  
  const blob = await put(path, fileBuffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });
  
  return blob.url;
}

/**
 * Delete a plugin version file
 */
export async function deletePluginFile(url: string): Promise<void> {
  await del(url);
}

/**
 * Delete all files for a plugin
 */
export async function deletePluginFiles(pluginId: string): Promise<void> {
  const prefix = `${PLUGIN_FOLDER}/${pluginId}/`;
  
  // List all files with this prefix
  const { blobs } = await list({ prefix });
  
  // Delete each file
  for (const blob of blobs) {
    await del(blob.url);
  }
}

/**
 * Check if a file exists and get its metadata
 */
export async function getFileInfo(url: string) {
  try {
    const info = await head(url);
    return {
      exists: true,
      size: info.size,
      contentType: info.contentType,
      uploadedAt: info.uploadedAt,
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Verify file checksum
 */
export async function verifyChecksum(
  url: string,
  expectedChecksum: string
): Promise<boolean> {
  try {
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const actualChecksum = createHash("sha256").update(buffer).digest("hex");
    return actualChecksum === expectedChecksum;
  } catch {
    return false;
  }
}

