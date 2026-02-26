// Shared helper for sending Expo push notifications

export interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

export async function sendPush(payload: PushPayload): Promise<void> {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sound: 'default', ...payload }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Expo push error:', text);
  }
}
