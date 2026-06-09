import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { sendPushToUsers } from "./push";

const db = admin.firestore();

interface RedemptionDoc {
  redeemerId: string;
  pointsCost: number;
  title: string;
  type: "punishment" | "reward";
}

export const onRedemptionCreated = onDocumentCreated(
  "groups/{groupId}/redemptions/{redemptionId}",
  async (event) => {
    const { groupId, redemptionId } = event.params;
    const snap = event.data;
    if (!snap) return;
    const red = snap.data() as RedemptionDoc;
    const redRef = snap.ref;
    const memberRef = db.collection("groups").doc(groupId)
      .collection("members").doc(red.redeemerId);
    const groupRef = db.collection("groups").doc(groupId);

    let recipients: string[] = [];

    await db.runTransaction(async (txn) => {
      const [memberSnap, groupSnap] = await Promise.all([
        txn.get(memberRef), txn.get(groupRef),
      ]);
      const member = memberSnap.data();
      const group = groupSnap.data();
      if (!member || !group) throw new HttpsError("not-found", "member missing");
      if ((member.points ?? 0) < red.pointsCost) {
        // Refund: delete this redemption
        txn.delete(redRef);
        throw new HttpsError("failed-precondition", "not enough points");
      }
      txn.update(memberRef, {
        points: admin.firestore.FieldValue.increment(-red.pointsCost),
      });
      recipients = (group.memberIds ?? []).filter((id: string) => id !== red.redeemerId);
    });

    // Post redemption_card to chat
    const msgRef = db.collection("groups").doc(groupId).collection("messages").doc();
    await msgRef.set({
      type: "redemption_card",
      authorId: red.redeemerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      refId: redemptionId,
    });

    await sendPushToUsers(recipients, {
      title: red.type === "reward" ? "Reward redeemed!" : "Punishment incoming",
      body: red.title,
      data: { groupId, redemptionId },
    });
  }
);
