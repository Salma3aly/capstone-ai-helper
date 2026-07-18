import Pusher from "pusher";

function getPusher(): Pusher {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const missing: string[] = [];
  if (!appId) missing.push("PUSHER_APP_ID");
  if (!key) missing.push("NEXT_PUBLIC_PUSHER_KEY");
  if (!secret) missing.push("PUSHER_SECRET");
  if (missing.length > 0) {
    throw new Error(`Missing Pusher env vars: ${missing.join(", ")}`);
  }
  return new Pusher({
    appId: appId!,
    key: key!,
    secret: secret!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
    useTLS: true,
  });
}

let _pusher: Pusher | null = null;
export function getPusherServer(): Pusher {
  if (!_pusher) _pusher = getPusher();
  return _pusher;
}
