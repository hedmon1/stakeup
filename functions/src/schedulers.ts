import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

const db = admin.firestore();

// Auto-approve any pending check-ins older than the group's autoApproveAfterHours.
export const resolvePendingCheckins = onSchedule("every 1 hours", async () => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // default 24h
  const snap = await db.collectionGroup("checkins")
    .where("status", "==", "pending")
    .where("submittedAt", "<", admin.firestore.Timestamp.fromMillis(cutoff))
    .limit(200)
    .get();

  for (const doc of snap.docs) {
    const ref = doc.ref;
    // Touch verifications array to retrigger onCheckinUpdated quorum logic by
    // appending a synthetic system "approve" — simpler: directly resolve here.
    const checkinPath = ref.path.split("/");
    const groupId = checkinPath[1];
    const goalId = checkinPath[3];
    const checkinId = checkinPath[5];
    const checkin = doc.data();
    const goalRef = db.collection("groups").doc(groupId).collection("goals").doc(goalId);
    const memberRef = db.collection("groups").doc(groupId).collection("members").doc(checkin.userId);

    await db.runTransaction(async (txn) => {
      const goalSnap = await txn.get(goalRef);
      const goal = goalSnap.data();
      if (!goal) return;
      const award = goal.pointsPerCheckin;
      txn.update(ref, {
        status: "verified",
        awardedPoints: award,
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      txn.set(memberRef, { points: admin.firestore.FieldValue.increment(award) }, { merge: true });
    });
    void groupId; void goalId; void checkinId;
  }
});

// Mark goals whose endDate has passed and aren't completed as failed.
export const expireGoals = onSchedule("every 1 hours", async () => {
  const now = admin.firestore.Timestamp.now();
  const snap = await db.collectionGroup("goals")
    .where("status", "in", ["proposed", "active"])
    .where("endDate", "<", now)
    .limit(200)
    .get();
  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { status: "failed" });
  }
  await batch.commit();
});
