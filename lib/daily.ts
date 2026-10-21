// Server-only helpers for Daily.co. Never import this file from a client component:
// DAILY_API_KEY must stay on the server.
const API = "https://api.daily.co/v1";

export const roomUrl = (name: string) => `https://${dailyHost()}.daily.co/${name}`;
export const dailyConfigured = () => Boolean(process.env.DAILY_API_KEY && dailyHost());
// Accepts "ilo", "ilo.daily.co" or "https://ilo.daily.co/" and always builds the right address
const dailyHost = () => (process.env.DAILY_DOMAIN ?? "").trim().replace(/^https?:\/\//, "").replace(/\.daily\.co.*$/, "").replace(/\/.*$/, "");

const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${process.env.DAILY_API_KEY}` });
const inSeconds = (s: number) => Math.floor(Date.now() / 1000) + s;

// A private, two-person room that expires on its own. Not recorded, no chat, no screen sharing.
export async function createDailyRoom(name: string) {
  const res = await fetch(`${API}/rooms`, {
    method: "POST",
    headers: headers(),
    cache: "no-store",
    body: JSON.stringify({
      name,
      privacy: "private", // nobody can join without a token we issue
      properties: {
        exp: inSeconds(3 * 3600),
        eject_at_room_exp: true,
        max_participants: 2,
        enable_chat: false,
        enable_screenshare: false,
        enable_prejoin_ui: false,
      },
    }),
  });
  if (!res.ok) throw new Error(`Daily room ${res.status}`);
}

// A short-lived pass for one person to enter one room
export async function createDailyToken(o: { roomName: string; userName: string; userId: string; isOwner: boolean; audioOnly: boolean }) {
  const res = await fetch(`${API}/meeting-tokens`, {
    method: "POST",
    headers: headers(),
    cache: "no-store",
    body: JSON.stringify({
      properties: {
        room_name: o.roomName,
        user_name: o.userName,
        user_id: o.userId.slice(0, 36),
        is_owner: o.isOwner,
        exp: inSeconds(2 * 3600),
        start_video_off: o.audioOnly,
        enable_screenshare: false,
      },
    }),
  });
  if (!res.ok) throw new Error(`Daily token ${res.status}`);
  const json = (await res.json()) as { token: string };
  return json.token;
}
