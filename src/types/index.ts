import { GoalTier } from '../theme';

export interface AppUser {
  id: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
  createdAt: Date;
  fcmTokens: string[];
  tutorialSeen?: boolean;
}

export interface GroupSettings {
  defaultTier: GoalTier;
  requirePeerVerify: boolean;
  quorumPct: number;
  autoApproveAfterHours: number;
}

export interface FriendGroup {
  id: string;
  name: string;
  photoURL?: string;
  createdAt: Date;
  ownerId: string;
  memberIds: string[];
  settings: GroupSettings;
}

export type MemberRole = 'owner' | 'admin' | 'member';

export interface Member {
  id: string;
  role: MemberRole;
  points: number;
  joinedAt: Date;
}

export interface GoalSchedule {
  type: 'weekly_count' | 'daily';
  target?: number;
  weekStart?: string;
  days?: string[];
}

export type GoalStatus = 'proposed' | 'active' | 'completed' | 'failed';

export interface Goal {
  id: string;
  title: string;
  description: string;
  proposerId: string;
  tier: GoalTier;
  pointsPerCheckin: number;
  completionBonus: number;
  participantIds: string[];
  schedule: GoalSchedule;
  startDate: Date;
  endDate: Date;
  status: GoalStatus;
  approvalsNeeded: number;
  approvals: string[];
}

export type CheckinStatus = 'pending' | 'verified' | 'rejected';
export type VoteValue = 'approve' | 'reject';

export interface Vote {
  userId: string;
  vote: VoteValue;
  at: Date;
}

export interface Checkin {
  id: string;
  goalId: string;
  userId: string;
  submittedAt: Date;
  photoPath?: string;
  note?: string;
  status: CheckinStatus;
  verifications: Vote[];
  resolvedAt?: Date;
  awardedPoints?: number;
}

export type MessageType =
  | 'chat' | 'system' | 'goal_card' | 'checkin_card' | 'redemption_card' | 'catalog_proposal';

export interface ChatMessage {
  id: string;
  type: MessageType;
  authorId?: string;
  body?: string;
  createdAt: Date;
  refId?: string;
  reactions: Record<string, string[]>;
}

export type CatalogType = 'punishment' | 'reward';
export type RedemptionStatus = 'active' | 'fulfilled' | 'expired';

export interface CatalogItem {
  id: string;
  title: string;
  description: string;
  type: CatalogType;
  pointsCost: number;
  suggestedProof?: string;
}

// A member-proposed reward/punishment that the group votes to accept.
// Lives at /groups/{groupId}/customItems/{id}. status 'active' = approved and
// usable in that group's Rewards list; 'proposed' = awaiting votes; 'denied' = rejected.
export type CatalogProposalStatus = 'proposed' | 'active' | 'denied';

export interface CatalogProposal {
  id: string;
  title: string;
  description: string;
  type: CatalogType;
  pointsCost: number;
  proposerId: string;
  status: CatalogProposalStatus;
  approvals: string[];
  rejections: string[];
  approvalsNeeded: number;
  createdAt: Date;
}

export interface Redemption {
  id: string;
  redeemerId: string;
  catalogItemId: string;
  title: string;
  description: string;
  customNote?: string;
  pointsCost: number;
  type: CatalogType;
  redeemedAt: Date;
  deadlineAt: Date;
  status: RedemptionStatus;
}
