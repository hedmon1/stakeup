import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { sendPushToUsers } from "./push";

const db = admin.firestore();

interface CheckinDoc {
  goalId: string;
  userId: string;
  status: "pending" | "verified" | "rejected";
  verifications: { userId: string; vote: "approve" | "reject"; at: admin.firestore.Timestamp }[];
  awardedPoints?: number;
  resolvedAt?: admin.firestore.Timestamp;
}

interface GoalDoc {
  participantIds: string[];
  pointsPerCheckin: number;
  completionBonus: number;
  schedule: { type: string; target?: number; days?: string[] };
  status: "proposed" | "active" | "completed" | "failed";
  endDate: admin.firestore.Timestamp;
}

interface GroupDoc {
  settings: { quorumPct: number; autoApproveAfterHours: number };
}

export const onCheckinCreated = onDocumentCreated(
  "groups/{groupId}/goals/{goalId}/checkins/{checkinId}",
  async (event) => {
    const { groupId, goalId, checkinId } = event.params;
    const snap = event.data;
    if (!snap) return;
    const checkin = snap.data() as CheckinDoc;

    // 1. Post checkin_card to the group chat
    const msgRef = db.collection("groups").doc(groupId).collection("messages").doc();
    await msgRef.set({
      type: "checkin_card",
      authorId: checkin.userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      refId: checkinId,
    });

    // 2. Notify the other participants
    const goalSnap = await db.collection("groups").doc(groupId).collection("goals").doc(goalId).get();
    const goal = goalSnap.data() as GoalDoc | undefined;
    if (!goal) return;
    const recipients = goal.participantIds.filter((id) => id !== checkin.userId);
    await sendPushToUsers(recipients, {
      title: "Check-in needs your vote",
      body: "Tap to approve or reject the proof.",
      data: { groupId, goalId, checkinId },
    });
  }
);

export const onCheckinUpdated = onDocumentUpdated(
  "groups/{groupId}/goals/{goalId}/checkins/{checkinId}",
  async (event) => {
    const { groupId, goalId, checkinId } = event.params;
    const before = event.data?.before.data() as CheckinDoc | undefined;
    const after = event.data?.after.data() as CheckinDoc | undefined;
    if (!before || !after) return;
    if (after.status !== "pending") return; // already resolved
    if (before.verifications.length === after.verifications.length) return;

    await db.runTransaction(async (txn) => {
      const checkinRef = db.collection("groups").doc(groupId)
        .collection("goals").doc(goalId)
        .collection("checkins").doc(checkinId);
      const goalRef = db.collection("groups").doc(groupId).collection("goals").doc(goalId);
      const groupRef = db.collection("groups").doc(groupId);

      const [checkinSnap, goalSnap, groupSnap] = await Promise.all([
        txn.get(checkinRef), txn.get(goalRef), txn.get(groupRef),
      ]);
      const checkin = checkinSnap.data() as CheckinDoc | undefined;
      const goal = goalSnap.data() as GoalDoc | undefined;
      const group = groupSnap.data() as GroupDoc | undefined;
      if (!checkin || !goal || !group) return;
      if (checkin.status !== "pending") return;

      const eligibleVoters = goal.participantIds.filter((id) => id !== checkin.userId);
      const quorum = Math.max(1, Math.ceil(eligibleVoters.length * group.settings.quorumPct));

      const approvals = checkin.verifications.filter((v) => v.vote === "approve").length;
      const rejects = checkin.verifications.filter((v) => v.vote === "reject").length;

      if (approvals >= quorum) {
        await resolveVerified(txn, groupId, goalId, checkinId, checkin, goal);
      } else if (rejects >= quorum) {
        txn.update(checkinRef, {
          status: "rejected",
          resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
          awardedPoints: 0,
        });
      }
    });
  }
);

async function resolveVerified(
  txn: admin.firestore.Transaction,
  groupId: string,
  goalId: string,
  checkinId: string,
  checkin: CheckinDoc,
  goal: GoalDoc
): Promise<void> {
  const checkinRef = db.collection("groups").doc(groupId)
    .collection("goals").doc(goalId)
    .collection("checkins").doc(checkinId);
  const memberRef = db.collection("groups").doc(groupId)
    .collection("members").doc(checkin.userId);
  const goalRef = db.collection("groups").doc(groupId).collection("goals").doc(goalId);

  // Count this user's already-verified check-ins for this goal
  const verifiedSnap = await db.collection("groups").doc(groupId)
    .collection("goals").doc(goalId)
    .collection("checkins")
    .where("userId", "==", checkin.userId)
    .where("status", "==", "verified")
    .get();
  const verifiedSoFar = verifiedSnap.size + 1; // including this one
  const target = goal.schedule.target ?? goal.schedule.days?.length ?? 1;
  const isFinal = verifiedSoFar >= target;

  let award = goal.pointsPerCheckin;
  if (isFinal) award += goal.completionBonus;

  txn.update(checkinRef, {
    status: "verified",
    resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    awardedPoints: award,
  });
  txn.set(memberRef, { points: admin.firestore.FieldValue.increment(award) }, { merge: true });

  if (isFinal) {
    // Check if every participant has hit target → mark goal completed
    txn.update(goalRef, { status: "completed" });
  }
}
