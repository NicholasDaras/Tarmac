// Supabase Edge Function: notify-follow
// Trigger: Database webhook on INSERT into public.follows
// Deploy: supabase functions deploy notify-follow

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPush } from '../_shared/expo-push.ts';

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const record = payload.record; // { id, follower_id, following_id, created_at }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get follower's username
    const { data: follower } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', record.follower_id)
      .single();

    // Get the followed user's push token
    const { data: tokenRow } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', record.following_id)
      .single();

    if (!tokenRow?.token) return new Response('No token', { status: 200 });

    await sendPush({
      to: tokenRow.token,
      title: '👤 New Follower',
      body: `@${follower?.username ?? 'Someone'} started following you`,
      data: { type: 'follow', path: `/profile/${record.follower_id}`, userId: record.follower_id },
    });

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('Error', { status: 500 });
  }
});
