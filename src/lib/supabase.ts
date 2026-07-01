import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public client (browser-safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (server-only — never expose to browser)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Bucket names
export const BUCKETS = {
  PRODUCT_IMAGES: process.env.SUPABASE_PRODUCT_IMAGES_BUCKET ?? "product-images",
  INVOICES: process.env.SUPABASE_INVOICES_BUCKET ?? "invoices",
  IMPORTS: process.env.SUPABASE_IMPORTS_BUCKET ?? "imports",
} as const;

// Upload a file and return its public URL
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer | Blob,
  contentType: string
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Delete a file by path
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

// Generate a signed URL (for private buckets)
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

// Get public URL without uploading
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
