import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { modelContentType, modelRelativeParts } from "@/lib/mental-health/files";
import { createClient } from "@/lib/supabase/server";

// The weights stay on disk and are fetched by the counsellor's browser. They are never imported into the JS bundle.
// Anyone who is not a signed-in counsellor gets the same 404 as an unknown file.
export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 404 });
  const { data: counsellor } = await supabase.from("counsellors").select("id").eq("profile_id", user.id).maybeSingle();
  if (!counsellor) return new Response(null, { status: 404 });

  const { name } = await context.params;
  const contentType = modelContentType(name);
  const parts = modelRelativeParts(name);
  if (!contentType || !parts) return new Response(null, { status: 404 });

  const filePath = path.join(process.cwd(), ...parts);
  let info;
  try {
    info = await stat(filePath);
  } catch {
    return new Response(null, { status: 404 });
  }

  const body = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(info.size),
      "Cache-Control": "private, no-store",
    },
  });
}
