import {
  collection, doc, addDoc, setDoc, updateDoc, getDoc, getDocs,
  onSnapshot, query, orderBy, where, limit, serverTimestamp,
  runTransaction, arrayUnion, increment, Timestamp,
  writeBatch, Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  FriendGroup, Member, Goal, Checkin, ChatMessage,
  CatalogItem, CatalogProposal, CatalogType, Redemption, VoteValue, GoalStatus,
} from '../types';
import { CATALOG_SEEDS } from './catalog-seeds';

// ── Converters ───────────────────────────────────────────────────────────────
const toDate = (v: any): Date => (v instanceof Timestamp ? v.toDate() : new Date());

const toGroup = (id: string, d: any): FriendGroup => ({
  id, name: d.name, photoURL: d.photoURL,
  createdAt: toDate(d.createdAt), ownerId: d.ownerId,
  memberIds: d.memberIds ?? [],
  settings: d.settings ?? { defaultTier: 'medium', requirePeerVerify: true, quorumPct: 0.5, autoApproveAfterHours: 24 },
});

const toMember = (id: string, d: any): Member => ({
  id, role: d.role ?? 'member', points: d.points ?? 0, joinedAt: toDate(d.joinedAt),
});

const toGoal = (id: string, d: any): Goal => ({
  id, title: d.title, description: d.description ?? '',
  proposerId: d.proposerId, tier: d.tier ?? 'medium',
  pointsPerCheckin: d.pointsPerCheckin ?? 3,
  completionBonus: d.completionBonus ?? 5,
  participantIds: d.participantIds ?? [],
  schedule: d.schedule ?? { type: 'weekly_count', target: 3 },
  startDate: toDate(d.startDate), endDate: toDate(d.endDate),
  status: d.status ?? 'proposed',
  approvalsNeeded: d.approvalsNeeded ?? 1,
  approvals: d.approvals ?? [],
});

const toCheckin = (id: string, d: any): Checkin => ({
  id, goalId: d.goalId, userId: d.userId,
  submittedAt: toDate(d.submittedAt),
  photoPath: d.photoPath, note: d.note,
  status: d.status ?? 'pending',
  verifications: (d.verifications ?? []).map((v: any) => ({ userId: v.userId, vote: v.vote, at: toDate(v.at) })),
  resolvedAt: d.resolvedAt ? toDate(d.resolvedAt) : undefined,
  awardedPoints: d.awardedPoints,
});

const toMessage = (id: string, d: any): ChatMessage => ({
  id, type: d.type, authorId: d.authorId, body: d.body,
  createdAt: toDate(d.createdAt), refId: d.refId,
  reactions: d.reactions ?? {},
});

const toRedemption = (id: string, d: any): Redemption => ({
  id, redeemerId: d.redeemerId, catalogItemId: d.catalogItemId,
  title: d.title, description: d.description, customNote: d.customNote,
  pointsCost: d.pointsCost, type: d.type,
  redeemedAt: toDate(d.redeemedAt), deadlineAt: toDate(d.deadlineAt),
  status: d.status ?? 'active',
});

// ── Groups ───────────────────────────────────────────────────────────────────
export function listenGroups(uid: string, cb: (g: FriendGroup[]) => void): Unsubscribe {
  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', uid));
  return onSnapshot(q, snap => cb(snap.docs.map(d => toGroup(d.id, d.data()))));
}

export async function createGroup(name: string, ownerId: string): Promise<string> {
  const ref = doc(collection(db, 'groups'));
  await setDoc(ref, {
    name, ownerId, memberIds: [ownerId], createdAt: serverTimestamp(),
    settings: { defaultTier: 'medium', requirePeerVerify: true, quorumPct: 0.5, autoApproveAfterHours: 24 },
  });
  await setDoc(doc(db, 'groups', ref.id, 'members', ownerId), {
    role: 'owner', points: 0, joinedAt: serverTimestamp(),
  });
  // Welcome system message
  await addDoc(collection(db, 'groups', ref.id, 'messages'), {
    type: 'system', body: `${name} created. Invite friends with the group ID below.`,
    createdAt: serverTimestamp(), reactions: {},
  });
  return ref.id;
}

export async function joinGroup(groupId: string, uid: string): Promise<void> {
  const ref = doc(db, 'groups', groupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Group not found. Double-check the ID.');
  await updateDoc(ref, { memberIds: arrayUnion(uid) });
  await setDoc(doc(db, 'groups', groupId, 'members', uid), {
    role: 'member', points: 0, joinedAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'groups', groupId, 'messages'), {
    type: 'system', body: 'A new member joined the group.',
    createdAt: serverTimestamp(), reactions: {},
  });
}

// ── Members ──────────────────────────────────────────────────────────────────
export function listenMembers(groupId: string, cb: (m: Member[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'groups', groupId, 'members'),
    snap => cb(snap.docs.map(d => toMember(d.id, d.data()))));
}

// ── User profiles (name + avatar lookup) ──────────────────────────────────────
// Member docs only store points/role, so resolve display names/avatars from the
// top-level /users collection (readable by any signed-in user per the rules).
export type ProfileLite = { displayName: string; photoURL?: string };

export async function fetchUserProfiles(
  uids: string[]
): Promise<Record<string, ProfileLite>> {
  const unique = Array.from(new Set(uids)).filter(Boolean);
  const out: Record<string, ProfileLite> = {};
  await Promise.all(unique.map(async uid => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      out[uid] = snap.exists()
        ? { displayName: snap.data().displayName || 'Member', photoURL: snap.data().photoURL }
        : { displayName: 'Member' };
    } catch {
      out[uid] = { displayName: 'Member' };
    }
  }));
  return out;
}

// ── Messages ─────────────────────────────────────────────────────────────────
export function listenMessages(groupId: string, cb: (m: ChatMessage[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'groups', groupId, 'messages'),
    orderBy('createdAt', 'asc'), limit(200)
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => toMessage(d.id, d.data()))));
}

export async function sendChat(groupId: string, authorId: string, body: string): Promise<void> {
  await addDoc(collection(db, 'groups', groupId, 'messages'), {
    type: 'chat', authorId, body, createdAt: serverTimestamp(), reactions: {},
  });
}

// ── Goals ────────────────────────────────────────────────────────────────────
export function listenGoals(groupId: string, cb: (g: Goal[]) => void): Unsubscribe {
  const q = query(collection(db, 'groups', groupId, 'goals'), orderBy('startDate', 'desc'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => toGoal(d.id, d.data()))));
}

export async function proposeGoal(groupId: string, goal: Omit<Goal, 'id'>): Promise<string> {
  // Auto-activate if approvals already meet the threshold (e.g. solo participant)
  const initialApprovals = goal.approvals ?? [];
  const initiallyActive = initialApprovals.length >= goal.approvalsNeeded;
  const finalStatus: GoalStatus = initiallyActive ? 'active' : 'proposed';

  const goalRef = await addDoc(collection(db, 'groups', groupId, 'goals'), {
    ...goal,
    status: finalStatus,
    startDate: Timestamp.fromDate(goal.startDate),
    endDate:   Timestamp.fromDate(goal.endDate),
    createdAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'groups', groupId, 'messages'), {
    type: 'goal_card', authorId: goal.proposerId,
    refId: goalRef.id, createdAt: serverTimestamp(), reactions: {},
  });
  if (initiallyActive) {
    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      type: 'system', body: `Goal "${goal.title}" is now active.`,
      createdAt: serverTimestamp(), reactions: {},
    });
  }
  return goalRef.id;
}

export async function approveGoal(groupId: string, goalId: string, uid: string): Promise<void> {
  const ref = doc(db, 'groups', groupId, 'goals', goalId);
  let didActivate = false;
  let title = '';
  await runTransaction(db, async txn => {
    const snap = await txn.get(ref);
    const d = snap.data()!;
    title = d.title;
    if (d.status !== 'proposed') return;
    const approvals: string[] = d.approvals ?? [];
    if (!approvals.includes(uid)) approvals.push(uid);
    const status: GoalStatus = approvals.length >= d.approvalsNeeded ? 'active' : 'proposed';
    didActivate = status === 'active';
    txn.update(ref, { approvals, status });
  });
  if (didActivate) {
    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      type: 'system', body: `Goal "${title}" is now active.`,
      createdAt: serverTimestamp(), reactions: {},
    });
  }
}

// ── Check-ins ────────────────────────────────────────────────────────────────
export function listenCheckins(groupId: string, goalId: string, cb: (c: Checkin[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'groups', groupId, 'goals', goalId, 'checkins'),
    orderBy('submittedAt', 'desc')
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => toCheckin(d.id, d.data()))));
}

export async function submitCheckin(
  groupId: string, goalId: string, uid: string, photoPath?: string, note?: string
): Promise<string> {
  // Get goal so we know participants + point value
  const goalRef  = doc(db, 'groups', groupId, 'goals', goalId);
  const goalSnap = await getDoc(goalRef);
  if (!goalSnap.exists()) throw new Error('Goal not found.');
  const g = goalSnap.data()!;
  const participants: string[] = g.participantIds ?? [];
  const nonSubmitters = participants.filter(p => p !== uid);
  const pointsPer = g.pointsPerCheckin ?? 3;

  // Solo (no peers to verify) → auto-verify immediately
  const isSolo = nonSubmitters.length === 0;
  const checkinPayload: any = {
    goalId, userId: uid,
    submittedAt: serverTimestamp(),
    status: isSolo ? 'verified' : 'pending',
    verifications: [],
  };
  if (photoPath)   checkinPayload.photoPath = photoPath;
  if (note?.trim()) checkinPayload.note     = note.trim();
  if (isSolo) {
    checkinPayload.awardedPoints = pointsPer;
    checkinPayload.resolvedAt    = Timestamp.now();
  }

  const checkinRef = await addDoc(
    collection(db, 'groups', groupId, 'goals', goalId, 'checkins'),
    checkinPayload
  );

  // Post checkin_card to chat
  await addDoc(collection(db, 'groups', groupId, 'messages'), {
    type: 'checkin_card', authorId: uid,
    refId: checkinRef.id, createdAt: serverTimestamp(), reactions: {},
  });

  // Award points if solo-verified
  if (isSolo) {
    await updateDoc(doc(db, 'groups', groupId, 'members', uid), {
      points: increment(pointsPer),
    });
    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      type: 'system', body: `Check-in verified · +${pointsPer} pts`,
      createdAt: serverTimestamp(), reactions: {},
    });
  }

  return checkinRef.id;
}

export async function castVote(
  groupId: string, goalId: string, checkinId: string, uid: string, vote: VoteValue
): Promise<void> {
  const checkinRef = doc(db, 'groups', groupId, 'goals', goalId, 'checkins', checkinId);
  const goalRef    = doc(db, 'groups', groupId, 'goals', goalId);

  let pointsAwarded = 0;
  let submitterId   = '';
  let finalStatus   = 'pending';

  await runTransaction(db, async txn => {
    const cSnap = await txn.get(checkinRef);
    const gSnap = await txn.get(goalRef);
    if (!cSnap.exists() || !gSnap.exists()) return;
    const c = cSnap.data()!;
    const g = gSnap.data()!;
    if (c.status !== 'pending') return;
    if (c.userId === uid) return;          // submitter can't vote on own

    submitterId = c.userId;
    const verts: any[] = (c.verifications ?? []).filter((v: any) => v.userId !== uid);
    verts.push({ userId: uid, vote, at: Timestamp.now() });

    const participants: string[] = g.participantIds ?? [];
    const nonSubmitters = participants.filter(p => p !== c.userId);
    const quorum = Math.max(1, Math.ceil(nonSubmitters.length * 0.5));

    const approves = verts.filter((v: any) => v.vote === 'approve').length;
    const rejects  = verts.filter((v: any) => v.vote === 'reject').length;

    let status = 'pending';
    if (approves >= quorum) status = 'verified';
    else if (rejects >= quorum) status = 'rejected';

    const update: any = { verifications: verts, status };
    if (status === 'verified') {
      pointsAwarded = g.pointsPerCheckin ?? 3;
      update.awardedPoints = pointsAwarded;
      update.resolvedAt    = Timestamp.now();
    } else if (status === 'rejected') {
      update.resolvedAt = Timestamp.now();
    }
    finalStatus = status;
    txn.update(checkinRef, update);

    if (pointsAwarded > 0) {
      const memberRef = doc(db, 'groups', groupId, 'members', c.userId);
      txn.update(memberRef, { points: increment(pointsAwarded) });
    }
  });

  // System message about the resolution (outside the txn)
  if (finalStatus === 'verified') {
    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      type: 'system',
      body: `Check-in verified · +${pointsAwarded} pts awarded`,
      createdAt: serverTimestamp(), reactions: {},
    });
  } else if (finalStatus === 'rejected') {
    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      type: 'system',
      body: 'Check-in rejected · no points awarded',
      createdAt: serverTimestamp(), reactions: {},
    });
  }
}

// ── Catalog ──────────────────────────────────────────────────────────────────
export async function fetchCatalog(): Promise<CatalogItem[]> {
  const snap = await getDocs(collection(db, 'catalog'));
  if (snap.empty) {
    // First run — seed from client
    await seedCatalog();
    const reSnap = await getDocs(collection(db, 'catalog'));
    return reSnap.docs.map(d => ({ id: d.id, ...d.data() } as CatalogItem));
  }
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CatalogItem));
}

async function seedCatalog(): Promise<void> {
  const batch = writeBatch(db);
  CATALOG_SEEDS.forEach(item => {
    const ref = doc(collection(db, 'catalog'));
    batch.set(ref, item);
  });
  await batch.commit();
}

// ── Redemptions ───────────────────────────────────────────────────────────────
export function listenRedemptions(groupId: string, cb: (r: Redemption[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'groups', groupId, 'redemptions'),
    orderBy('redeemedAt', 'desc')
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => toRedemption(d.id, d.data()))));
}

export async function redeem(
  groupId: string, uid: string, item: CatalogItem, customNote?: string
): Promise<void> {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);

  // Deduct points + create redemption doc atomically
  const memberRef = doc(db, 'groups', groupId, 'members', uid);
  const redRef    = doc(collection(db, 'groups', groupId, 'redemptions'));

  await runTransaction(db, async txn => {
    const mSnap = await txn.get(memberRef);
    if (!mSnap.exists()) throw new Error('You are not a member of this group.');
    const cur = mSnap.data()!.points ?? 0;
    if (cur < item.pointsCost) throw new Error(`Not enough points (you have ${cur}, need ${item.pointsCost}).`);
    txn.update(memberRef, { points: increment(-item.pointsCost) });

    txn.set(redRef, {
      redeemerId: uid, catalogItemId: item.id,
      title: item.title, description: item.description,
      ...(customNote ? { customNote } : {}),
      pointsCost: item.pointsCost, type: item.type,
      redeemedAt: serverTimestamp(),
      deadlineAt: Timestamp.fromDate(deadline),
      status: 'active',
    });
  });

  // Post the redemption_card to chat
  await addDoc(collection(db, 'groups', groupId, 'messages'), {
    type: 'redemption_card', authorId: uid,
    refId: redRef.id, createdAt: serverTimestamp(), reactions: {},
  });
}

// ── Group custom catalog (member-proposed reward/punishment) ──────────────────
const toCatalogProposal = (id: string, d: any): CatalogProposal => ({
  id,
  title: d.title,
  description: d.description ?? '',
  type: d.type,
  pointsCost: d.pointsCost ?? 0,
  proposerId: d.proposerId,
  status: d.status ?? 'proposed',
  approvals: d.approvals ?? [],
  rejections: d.rejections ?? [],
  approvalsNeeded: d.approvalsNeeded ?? 1,
  createdAt: toDate(d.createdAt),
});

// A member proposes a new reward/punishment. With other members present it posts
// a catalog_proposal card to chat for majority approval; a solo group adds it now.
export async function proposeCatalogItem(
  groupId: string,
  proposerId: string,
  memberCount: number,
  item: { type: CatalogType; title: string; description: string; pointsCost: number }
): Promise<string> {
  const others = Math.max(0, memberCount - 1);
  const approvalsNeeded = others === 0 ? 0 : Math.max(1, Math.ceil(others / 2));
  const status = approvalsNeeded === 0 ? 'active' : 'proposed';

  const ref = await addDoc(collection(db, 'groups', groupId, 'customItems'), {
    title: item.title,
    description: item.description,
    type: item.type,
    pointsCost: item.pointsCost,
    proposerId,
    status,
    approvals: [],
    rejections: [],
    approvalsNeeded,
    createdAt: serverTimestamp(),
  });

  if (status === 'proposed') {
    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      type: 'catalog_proposal', authorId: proposerId,
      refId: ref.id, createdAt: serverTimestamp(), reactions: {},
    });
  } else {
    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      type: 'system',
      body: `New ${item.type} "${item.title}" added to the catalog.`,
      createdAt: serverTimestamp(), reactions: {},
    });
  }
  return ref.id;
}

// Live single-proposal listener used by the chat approve/deny card.
export function listenCatalogProposal(
  groupId: string, itemId: string, cb: (p: CatalogProposal | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'groups', groupId, 'customItems', itemId), snap =>
    cb(snap.exists() ? toCatalogProposal(snap.id, snap.data()) : null)
  );
}

// Approved (active) custom items for this group — merged into the Rewards list.
export function listenGroupItems(groupId: string, cb: (items: CatalogItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'groups', groupId, 'customItems'), where('status', '==', 'active'));
  return onSnapshot(q, snap => cb(snap.docs.map(d => {
    const x = d.data();
    return {
      id: d.id, title: x.title, description: x.description ?? '',
      type: x.type, pointsCost: x.pointsCost ?? 0,
    } as CatalogItem;
  })));
}

// A non-proposer member votes; majority approve → item goes active, majority
// reject → denied. Mirrors the goal/check-in voting pattern.
export async function voteCatalogProposal(
  groupId: string, itemId: string, uid: string, vote: VoteValue
): Promise<void> {
  const ref = doc(db, 'groups', groupId, 'customItems', itemId);
  let finalStatus = 'proposed';
  let title = '';
  let type = '';
  await runTransaction(db, async txn => {
    const snap = await txn.get(ref);
    if (!snap.exists()) return;
    const d = snap.data()!;
    title = d.title; type = d.type;
    if (d.status !== 'proposed') return;     // already resolved
    if (d.proposerId === uid) return;        // proposer can't vote on their own
    const approvals:  string[] = (d.approvals  ?? []).filter((u: string) => u !== uid);
    const rejections: string[] = (d.rejections ?? []).filter((u: string) => u !== uid);
    if (vote === 'approve') approvals.push(uid); else rejections.push(uid);
    const needed = d.approvalsNeeded ?? 1;
    let status = 'proposed';
    if (approvals.length >= needed) status = 'active';
    else if (rejections.length >= needed) status = 'denied';
    finalStatus = status;
    txn.update(ref, { approvals, rejections, status });
  });
  if (finalStatus === 'active') {
    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      type: 'system', body: `New ${type} "${title}" was approved and added to the catalog.`,
      createdAt: serverTimestamp(), reactions: {},
    });
  } else if (finalStatus === 'denied') {
    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      type: 'system', body: `Proposed ${type} "${title}" was denied.`,
      createdAt: serverTimestamp(), reactions: {},
    });
  }
}
