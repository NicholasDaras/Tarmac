// Supabase Edge Function: delete-drive-storage
// Trigger: Database webhook on DELETE from public.drives
// Deploy: supabase functions deploy delete-drive-storage
//
// Purges all Storage objects under drives/{driveId}/ when a drive row is deleted.
// The DB cascade handles drive_photos, drive_stops, likes, saves, comments automatically.
// Only Storage (bucket: "drives") needs explicit cleanup since cascades don't reach it.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();

    // Database DELETE webhooks send old_record (not record)
    const driveId = payload.old_record?.id;
    if (!driveId) return new Response('OK', { status: 200 });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // List all files stored under drives/{driveId}/
    const { data: files, error: listError } = await admin.storage
      .from('drives')
      .list(driveId);

    if (listError) {
      console.error('Storage list error:', listError);
      return new Response('Error', { status: 500 });
    }

    if (files?.length) {
      const { error: removeError } = await admin.storage
        .from('drives')
        .remove(files.map(f => `${driveId}/${f.name}`));

      if (removeError) {
        console.error('Storage remove error:', removeError);
        return new Response('Error', { status: 500 });
      }

      console.log(`Deleted ${files.length} photo(s) for drive ${driveId}`);
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('delete-drive-storage error:', err);
    return new Response('Error', { status: 500 });
  }
});
