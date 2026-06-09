import * as admin from "firebase-admin";

const db = admin.firestore();
const messaging = admin.messaging();

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<void> {
  if (userIds.length === 0) return;
  const userDocs = await db.getAll(
    ...userIds.map((uid) => db.collection("users").doc(uid))
  );
  const tokens: string[] = [];
  for (const doc of userDocs) {
    const data = doc.data();
    if (!data) continue;
    const fcmTokens: string[] = Array.isArray(data.fcmTokens) ? data.fcmTokens : [];
    tokens.push(...fcmTokens);
  }
  if (tokens.length === 0) return;
  await messaging.sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
  });
}
