// Supabase Edge Function: notify-comment
// Trigger: Database webhook on INSERT into public.comments
// Deploy: supabase functions deploy notify-comment

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPush } from '../_shared/expo-push.ts';

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const record = payload.record; // { id, drive_id, user_id, text, created_at }

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
    if (drive.user_id === record.user_id) return new Response('Self-comment', { status: 200 });

    // Get commenter's username
    const { data: commenter } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', record.user_id)
      .single();

    // Get drive owner's push token
    const { data: tokenRow } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', drive.user_id)
      .single();

    if (!tokenRow?.token) return new Response('No token', { status: 200 });

    const preview = record.text?.length > 50
      ? record.text.substring(0, 47) + '...'
      : record.text;

    await sendPush({
      to: tokenRow.token,
      title: '💬 New Comment',
      body: `@${commenter?.username ?? 'Someone'}: "${preview}"`,
      data: { type: 'comment', path: `/drive/${record.drive_id}`, driveId: record.drive_id },
    });

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('Error', { status: 500 });
  }
});
