// Supabase Edge Function: delete-account
// Trigger: Called directly from the client via fetch (not a webhook)
// Deploy: supabase functions deploy delete-account

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Verify caller identity via their JWT
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    // ── 1. Delete drive photos from Storage ──────────────────────────────
    // Photos are stored at drives/{driveId}/{filename}
    // Fetch all drive IDs for this user first, then list files per drive
    const { data: drives } = await admin
      .from('drives')
      .select('id')
      .eq('user_id', user.id);

    if (drives?.length) {
      for (const drive of drives) {
        const { data: driveFiles } = await admin.storage
          .from('drives')
          .list(drive.id);
        if (driveFiles?.length) {
          await admin.storage
            .from('drives')
            .remove(driveFiles.map(f => `${drive.id}/${f.name}`));
        }
      }
    }

    // ── 2. Delete profile photo from Storage ─────────────────────────────
    const { data: profileFiles } = await admin.storage
      .from('profiles')
      .list(user.id);
    if (profileFiles?.length) {
      await admin.storage
        .from('profiles')
        .remove(profileFiles.map(f => `${user.id}/${f.name}`));
    }

    // ── 3. Delete profile row ─────────────────────────────────────────────
    // This cascades to: drives, drive_photos, drive_stops, likes, saves,
    // comments, follows, blocks, reports, push_tokens (all have FK → profiles.id)
    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile delete error:', profileError);
      return new Response('Failed to delete profile', { status: 500 });
    }

    // ── 4. Delete auth user ───────────────────────────────────────────────
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Auth user delete error:', deleteError);
      return new Response('Failed to delete auth user', { status: 500 });
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('delete-account error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
});
