// To address TypeScript errors when @cloudflare/workers-types is not available,
// we'll provide minimal type definitions for the Cloudflare environment.
// In a real-world project, you should `npm install -D @cloudflare/workers-types`
// and configure it in `tsconfig.json`.
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

interface R2Bucket {
  // R2 binding object does not directly expose bucketName to the code
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

import { S3Client, PutObjectCommand, DeleteObjectsCommand, DeleteObjectsCommandOutput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface Env {
  // Bindings
  BOOKFEEL_KV: KVNamespace;
  BOOK_ASSETS_BUCKET: R2Bucket;

  // Secrets
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_URL: string;
  
  // Environment Variables (from wrangler.toml `[vars]`)
  R2_BUCKET_NAME: string;
}

interface BookEntry {
  slug: string;
  bookTitle: string;
  bookCover?: string;
  tagline: string;
  reflection: string;
  createdAt: string;
  editKey: string; // The secret key
}

/**
 * Generates a random alphanumeric string of a given length.
 * @param length The desired length of the string. Defaults to 12.
 */
const generateAlphanumericSlug = (length: number = 12): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};


/**
 * Generates a unique slug by checking for its existence in KV.
 * Retries a few times before falling back to a more random format.
 * @param kv The KV namespace to check against.
 */
async function getUniqueSlug(kv: KVNamespace): Promise<string> {
  let slug: string;
  let attempts = 0;
  const maxAttempts = 20; // Safety break to prevent infinite loops

  while (attempts < maxAttempts) {
    slug = generateAlphanumericSlug();
    const existing = await kv.get(slug);
    if (existing === null) {
      return slug; // Found a unique slug
    }
    attempts++;
  }

  // If we couldn't find a unique slug after several attempts, add more entropy.
  // This is a fallback for a highly saturated namespace.
  console.warn(`Could not generate unique slug in ${maxAttempts} attempts. Adding suffix.`);
  return `${generateAlphanumericSlug()}-${Math.random().toString(36).substring(2, 6)}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Edit-Key",
};

const getR2Client = (env: Env) => {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
};


export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // --- Simple Router ---

    // POST /api/upload-url: Generates a secure URL for the frontend to upload a file directly to R2.
    if (request.method === "POST" && path === "/api/upload-url") {
      try {
        if (!env.R2_BUCKET_NAME) {
          throw new Error("Configuration error: R2_BUCKET_NAME is not set in wrangler.toml under [vars].");
        }
        
        const { filename, contentType } = await request.json() as { filename: string; contentType: string; };
        if (!filename || !contentType) {
          return new Response(JSON.stringify({ error: 'Filename and contentType are required' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
        }
        
        const s3 = getR2Client(env);
        const fileExtension = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const uniqueKey = `${crypto.randomUUID()}.${fileExtension}`;

        const signedUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: uniqueKey, ContentType: contentType }), { expiresIn: 360 });
        const publicBaseUrl = env.R2_PUBLIC_URL.endsWith('/') ? env.R2_PUBLIC_URL.slice(0, -1) : env.R2_PUBLIC_URL;
        const publicUrl = `${publicBaseUrl}/${uniqueKey}`;

        return new Response(JSON.stringify({ uploadUrl: signedUrl, publicUrl: publicUrl }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch(e) {
        console.error("Error generating upload URL:", e);
        const errorDetails = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: `Worker Error: ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // POST /api/entries/list: Get summary data for multiple entries.
    if (request.method === "POST" && path === "/api/entries/list") {
        try {
            const { slugs } = await request.json() as { slugs: string[] };
            if (!Array.isArray(slugs)) {
                return new Response(JSON.stringify({ error: 'Request body must be an object with a "slugs" array.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
            }
            
            const kvPromises = slugs.map(slug => env.BOOKFEEL_KV.get(slug));
            const results = await Promise.all(kvPromises);
            
            const summaries = results
                .filter(json => json !== null)
                .map(json => {
                    const entry: BookEntry = JSON.parse(json!);
                    return {
                        slug: entry.slug,
                        bookTitle: entry.bookTitle,
                        createdAt: entry.createdAt,
                        tagline: entry.tagline,
                        bookCover: entry.bookCover,
                    };
                });

            return new Response(JSON.stringify(summaries), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        } catch (e) {
            console.error("Error in /api/entries/list:", e);
            const errorDetails = e instanceof Error ? e.message : "Bad Request or Internal Error";
            return new Response(JSON.stringify({ error: errorDetails }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
    }

    // POST /api/entry: Creates a new entry record in KV.
    if (request.method === "POST" && path === "/api/entry") {
      try {
        const entryData: Omit<BookEntry, 'slug'> = await request.json();

        if (!entryData.bookTitle || !entryData.editKey) {
            return new Response(JSON.stringify({ error: 'Book Title and Edit Key are required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }
        
        const slug = await getUniqueSlug(env.BOOKFEEL_KV);
        
        const newEntry: BookEntry = {
          ...entryData,
          slug: slug,
        };
        
        await env.BOOKFEEL_KV.put(newEntry.slug, JSON.stringify(newEntry));
        
        return new Response(JSON.stringify({ success: true, slug: newEntry.slug }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        console.error("Error creating entry:", e);
        const errorDetails = e instanceof Error ? e.message : "Bad Request or Internal Error";
        return new Response(JSON.stringify({ error: errorDetails }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Routes for /api/entry/:slug
    if (path.startsWith("/api/entry/")) {
      const slug = path.substring("/api/entry/".length);
      if (!slug) return new Response("Not Found", { status: 404 });

      // GET /api/entry/:slug: Retrieves an entry.
      if (request.method === "GET") {
        const entryJson = await env.BOOKFEEL_KV.get(slug);
        if (entryJson === null) {
          return new Response(JSON.stringify({ error: "Entry not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // SECURITY: Omit editKey before sending to client
        const entry: Partial<BookEntry> = JSON.parse(entryJson);
        delete entry.editKey;
        return new Response(JSON.stringify(entry), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      // PUT /api/entry/:slug: Updates an existing entry.
      if (request.method === "PUT") {
          const editKey = request.headers.get('X-Edit-Key');
          if (!editKey) {
              return new Response(JSON.stringify({ error: 'Authentication required. Edit key missing.' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          try {
              if (!env.R2_BUCKET_NAME) {
                  throw new Error("Configuration error: R2_BUCKET_NAME is not set.");
              }
              const entryJson = await env.BOOKFEEL_KV.get(slug);
              if (!entryJson) {
                  return new Response(JSON.stringify({ error: 'Entry not found.' }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }

              const storedEntry: BookEntry = JSON.parse(entryJson);
              if (storedEntry.editKey !== editKey) {
                  return new Response(JSON.stringify({ error: 'Forbidden. Invalid edit key.' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }
              
              const updateData: Partial<BookEntry> & { bookCover?: string | null } = await request.json();

              // If a new book cover is being uploaded, the old one must be deleted.
              if (updateData.bookCover !== undefined && storedEntry.bookCover && updateData.bookCover !== storedEntry.bookCover) {
                  const s3 = getR2Client(env);
                  try {
                      const key = new URL(storedEntry.bookCover).pathname.substring(1);
                      if (key) {
                           await s3.send(new DeleteObjectsCommand({
                              Bucket: env.R2_BUCKET_NAME,
                              Delete: { Objects: [{ Key: key }] },
                           }));
                      }
                  } catch (e) {
                      console.error(`[Update] Failed to parse or delete old book cover ${storedEntry.bookCover} for slug ${slug}:`, e);
                      // Non-fatal, continue with update
                  }
              }

              const updatedEntry: BookEntry = {
                  ...storedEntry,
                  bookTitle: updateData.bookTitle ?? storedEntry.bookTitle,
                  tagline: updateData.tagline ?? storedEntry.tagline,
                  reflection: updateData.reflection ?? storedEntry.reflection,
                  bookCover: updateData.bookCover === null ? undefined : (updateData.bookCover ?? storedEntry.bookCover),
              };

              await env.BOOKFEEL_KV.put(slug, JSON.stringify(updatedEntry));

              const publicEntryData = { ...updatedEntry };
              delete (publicEntryData as Partial<BookEntry>).editKey;

              return new Response(JSON.stringify(publicEntryData), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

          } catch (e) {
              const errorDetails = e instanceof Error ? e.message : String(e);
              console.error(`[Update] Critical failure during update of slug ${slug}:`, errorDetails);
              return new Response(JSON.stringify({ error: `Failed to update entry. ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
      }

      // DELETE /api/entry/:slug: Permanently deletes an entry and its images.
      if (request.method === "DELETE") {
        const editKey = request.headers.get('X-Edit-Key');
        if (!editKey) {
          return new Response(JSON.stringify({ error: 'Authentication required. Edit key missing.' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        try {
          if (!env.R2_BUCKET_NAME) {
              throw new Error("Configuration error: R2_BUCKET_NAME is not set.");
          }
          const entryJson = await env.BOOKFEEL_KV.get(slug);

          if (!entryJson) {
            return new Response(null, { status: 204, headers: corsHeaders });
          }

          const entry: BookEntry = JSON.parse(entryJson);
          
          if (entry.editKey !== editKey) {
            return new Response(JSON.stringify({ error: 'Forbidden. Invalid edit key.' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          
          if (entry.bookCover) {
              const s3 = getR2Client(env);
              try {
                  const key = new URL(entry.bookCover).pathname.substring(1);
                   if (key) {
                       const deleteResult: DeleteObjectsCommandOutput = await s3.send(new DeleteObjectsCommand({
                        Bucket: env.R2_BUCKET_NAME,
                        Delete: { Objects: [{ Key: key }] },
                      }));
                      if (deleteResult.Errors && deleteResult.Errors.length > 0) {
                          console.error(`[Delete] Errors deleting book cover from R2 for slug ${slug}:`, deleteResult.Errors);
                      }
                   }
              } catch (e) {
                  console.error(`[Delete] Failed to parse or delete book cover ${entry.bookCover} for slug ${slug}:`, e);
                  // Non-fatal, proceed with KV deletion.
              }
          }
          
          await env.BOOKFEEL_KV.delete(slug);
          return new Response(null, { status: 204, headers: corsHeaders });

        } catch (e) {
          const errorDetails = e instanceof Error ? e.message : String(e);
          console.error(`[Delete] Critical failure during deletion of slug ${slug}:`, errorDetails);
          return new Response(JSON.stringify({ error: `Failed to delete entry from storage. ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};