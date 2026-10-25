// Which copy of a session note to trust when a workspace opens. Kept separate and free of storage so the rule can be tested.
export type LocalNote = { text: string; dirty: boolean; syncedNonce: string | null };
export type NoteChoice = "local" | "keep" | "server" | "empty";

export function chooseNote(local: LocalNote | undefined, serverNonce: string | null): NoteChoice {
  if (local?.dirty) return "local";                              // edits on this device that haven't uploaded yet always win, and will upload
  if (serverNonce === null) return "empty";                      // nothing on the server: never written, or cleared
  if (local && local.syncedNonce === serverNonce) return "keep"; // this device already has that exact version
  return "server";                                               // newer or first time here: unlock the server copy
}
