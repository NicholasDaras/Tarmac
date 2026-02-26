// Supabase Edge Function: notify-like
// Trigger: Database webhook on INSERT into public.likes
// Deploy: supabase functions deploy notify-like

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPush } from '../_shared/expo-push.ts';

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const record = payload.record; // { id, drive_id, user_id, created_at }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get the drive to find its owner
    const { data: drive } = await supabase
      .from('drives')
      .select('user_id, title')
      .eq('id', record.drive_id)
      .single();

    if (!drive) return new Response('Drive not found', { status: 200 });

    // Don't notify yourself
    if (drive.user_id === record.user_id) return new Response('Self-like', { status: 200 });

    // Get the liker's username
    const { data: liker } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', record.user_id)
      .single();

    // Get the drive owner's push token
    const { data: tokenRow } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', drive.user_id)
      .single();

    if (!tokenRow?.token) return new Response('No token', { status: 200 });

    await sendPush({
      to: tokenRow.token,
      title: '❤️ New Like',
      body: `@${liker?.username ?? 'Someone'} liked your drive "${drive.title}"`,
      data: { type: 'like', path: `/drive/${record.drive_id}`, driveId: record.drive_id },
    });

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('Error', { status: 500 });
  }
});
