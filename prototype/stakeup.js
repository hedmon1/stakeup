#!/usr/bin/env node
// StakeUp terminal prototype — runs the full core loop in memory.
// No Firebase, no Xcode, no install needed.
// Run: node stakeup.js

const readline = require("readline");

// ─── In-memory state ────────────────────────────────────────────────────────
const state = {
  users: {},      // uid → { name, points }
  group: null,    // single group for the prototype
  goals: {},      // goalId → goal
  checkins: {},   // checkinId → checkin
  messages: [],   // chat log
  catalog: [
    { id: "c1", title: "Group does 50 pushups on camera", type: "punishment", cost: 15 },
    { id: "c2", title: "Everyone vlogs a day in their life", type: "punishment", cost: 40 },
    { id: "c3", title: "Loser wears a costume to dinner", type: "punishment", cost: 25 },
    { id: "c4", title: "Cold-plunge / ice bath", type: "punishment", cost: 30 },
    { id: "c5", title: "Redeemer picks next group hangout", type: "reward", cost: 20 },
    { id: "c6", title: "Group chips in $20 each for redeemer's wishlist", type: "reward", cost: 50 },
    { id: "c7", title: "Group makes a hype video for redeemer", type: "reward", cost: 30 },
    { id: "c8", title: "Free pass on next missed check-in", type: "reward", cost: 15 },
    { id: "c9", title: "Group buys redeemer a meal out", type: "reward", cost: 60 },
    { id: "c10", title: "Crown 👑 in group chat for a week", type: "reward", cost: 10 },
  ],
  currentUser: null,
  idCounter: 1,
};

const TIER = {
  easy:   { pointsPerCheckin: 1, completionBonus: 2 },
  medium: { pointsPerCheckin: 3, completionBonus: 5 },
  hard:   { pointsPerCheckin: 5, completionBonus: 10 },
};

function nextId() { return `id${state.idCounter++}`; }

// ─── ANSI colours ─────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold:  "\x1b[1m",
  dim:   "\x1b[2m",
  cyan:  "\x1b[36m",
  green: "\x1b[32m",
  yellow:"\x1b[33m",
  red:   "\x1b[31m",
  magenta:"\x1b[35m",
  blue:  "\x1b[34m",
};
const bold = (s) => `${c.bold}${s}${c.reset}`;
const dim  = (s) => `${c.dim}${s}${c.reset}`;
const cyan = (s) => `${c.cyan}${s}${c.reset}`;
const green = (s) => `${c.green}${s}${c.reset}`;
const yellow = (s) => `${c.yellow}${s}${c.reset}`;
const red  = (s) => `${c.red}${s}${c.reset}`;
const mag  = (s) => `${c.magenta}${s}${c.reset}`;
const blue = (s) => `${c.blue}${s}${c.reset}`;

// ─── readline helpers ──────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));
const pause = (ms) => new Promise((res) => setTimeout(res, ms));

function separator(title = "") {
  const line = "─".repeat(50);
  if (title) console.log(`\n${cyan(line)}\n  ${bold(title)}\n${cyan(line)}`);
  else        console.log(cyan(line));
}

function printChat() {
  separator("GROUP CHAT — " + (state.group?.name ?? ""));
  for (const msg of state.messages.slice(-20)) {
    const who = bold(msg.author.padEnd(12));
    if (msg.type === "system") {
      console.log(`  ${dim("⚙")}  ${dim(msg.text)}`);
    } else if (msg.type === "goal") {
      const g = state.goals[msg.refId];
      const tier = g?.tier ?? "?";
      const tierColor = tier === "hard" ? red : tier === "medium" ? yellow : green;
      console.log(`  ${cyan("🎯")} ${who}  ${bold(g?.title ?? "Goal")}  [${tierColor(tier.toUpperCase())}]  ${dim(g?.pointsPerCheckin + "pt/check-in")}`);
    } else if (msg.type === "checkin") {
      const ci = state.checkins[msg.refId];
      const statusStr = ci?.status === "verified" ? green("✓ Verified")
                      : ci?.status === "rejected" ? red("✗ Rejected")
                      : yellow("⏳ Pending votes");
      console.log(`  ${green("📸")} ${who}  checked in  ${statusStr}  ${dim(ci?.goalTitle ?? "")}`);
      if (ci) {
        const ap = ci.votes.filter(v => v.vote === "approve").length;
        const rj = ci.votes.filter(v => v.vote === "reject").length;
        console.log(`       ${dim(`Votes: ${ap} approve, ${rj} reject`)}`);
      }
    } else if (msg.type === "redemption") {
      const r = msg.redemption;
      const icon = r.type === "reward" ? "🎁" : "💥";
      console.log(`  ${mag(icon)} ${who}  redeemed: ${bold(r.title)}  ${dim(`(${r.cost} pts)`)}`);
    } else {
      console.log(`  ${dim("💬")} ${who}  ${msg.text}`);
    }
  }
  console.log();
}

function printScoreboard() {
  separator("SCOREBOARD");
  const sorted = Object.values(state.users).sort((a, b) => b.points - a.points);
  sorted.forEach((u, i) => {
    const crown = i === 0 ? " 👑" : "";
    const bar = "█".repeat(Math.max(1, Math.floor(u.points / 2)));
    const you = u.uid === state.currentUser?.uid ? dim(" (you)") : "";
    console.log(`  ${bold(`#${i+1}`)}  ${u.name.padEnd(14)}${you}  ${cyan(bar)}  ${bold(u.points)} pts${crown}`);
  });
  console.log();
}

function printGoals() {
  separator("ACTIVE GOALS");
  const active = Object.values(state.goals).filter(g => g.status === "active");
  if (!active.length) { console.log(dim("  No active goals.\n")); return; }
  for (const g of active) {
    const tier = g.tier;
    const tierColor = tier === "hard" ? red : tier === "medium" ? yellow : green;
    const progress = g.participants.map(uid => {
      const u = state.users[uid];
      const done = Object.values(state.checkins).filter(
        ci => ci.goalId === g.id && ci.userId === uid && ci.status === "verified"
      ).length;
      return `${u?.name}: ${done}/${g.target}`;
    }).join("  ");
    console.log(`  ${cyan("🎯")} ${bold(g.title)}`);
    console.log(`     Tier: ${tierColor(tier)}  |  ${g.pointsPerCheckin}pt/check-in  |  +${g.completionBonus} completion bonus`);
    console.log(`     Progress: ${dim(progress)}`);
  }
  console.log();
}

// ─── Core logic ────────────────────────────────────────────────────────────

function addSystemMsg(text) {
  state.messages.push({ type: "system", author: "StakeUp", text });
}

function resolveCheckin(checkinId) {
  const ci = state.checkins[checkinId];
  if (!ci || ci.status !== "pending") return;
  const goal = state.goals[ci.goalId];
  const group = state.group;
  if (!goal || !group) return;

  const eligibleVoters = goal.participants.filter(id => id !== ci.userId);
  const quorum = Math.max(1, Math.ceil(eligibleVoters.length * group.quorumPct));
  const approvals = ci.votes.filter(v => v.vote === "approve").length;
  const rejects   = ci.votes.filter(v => v.vote === "reject").length;

  if (approvals >= quorum) {
    ci.status = "verified";
    const verifiedCount = Object.values(state.checkins).filter(
      c => c.goalId === ci.goalId && c.userId === ci.userId && c.status === "verified"
    ).length; // includes this one since we just set it
    const isFinal = verifiedCount >= goal.target;
    const award = goal.pointsPerCheckin + (isFinal ? goal.completionBonus : 0);
    ci.awardedPoints = award;
    state.users[ci.userId].points += award;
    const bonusNote = isFinal ? ` (+${goal.completionBonus} completion bonus!)` : "";
    addSystemMsg(`${state.users[ci.userId].name} earned ${award} pts for "${goal.title}"${bonusNote}`);
    if (isFinal) {
      goal.status = "completed";
      addSystemMsg(`Goal "${goal.title}" completed by ${state.users[ci.userId].name}! 🎉`);
    }
  } else if (rejects >= quorum) {
    ci.status = "rejected";
    addSystemMsg(`${state.users[ci.userId].name}'s check-in for "${goal.title}" was rejected.`);
  }
}

// ─── Screens ───────────────────────────────────────────────────────────────

async function screenLogin() {
  separator("WELCOME TO STAKEUP");
  console.log("  Keep your friends accountable — for real.\n");

  const existing = Object.values(state.users);
  if (existing.length) {
    console.log("  Existing users:");
    existing.forEach((u, i) => console.log(`    ${i+1}. ${u.name}`));
    console.log(`    ${existing.length + 1}. Add a new user`);
    const choice = await ask("\n  Pick a user or add new: ");
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < existing.length) {
      state.currentUser = existing[idx];
      console.log(green(`\n  Welcome back, ${state.currentUser.name}! 👋\n`));
      return;
    }
  }

  const name = await ask("  Enter your name: ");
  const uid = nextId();
  state.users[uid] = { uid, name: name.trim() || "User", points: 0 };
  state.currentUser = state.users[uid];
  console.log(green(`\n  Account created! Welcome, ${state.currentUser.name}! 🎉\n`));
}

async function screenSetupGroup() {
  if (state.group) return;
  separator("CREATE YOUR GROUP");
  const name = await ask("  Group name: ");
  state.group = {
    id: nextId(),
    name: name.trim() || "The Squad",
    ownerId: state.currentUser.uid,
    memberIds: [state.currentUser.uid],
    quorumPct: 0.5,
  };

  console.log(`\n  ${green("Group created!")} Share this invite code with friends: ${bold(state.group.id)}\n`);

  // Optionally add simulated friends
  const addFriends = await ask("  Add simulated friends to test with? (y/n): ");
  if (addFriends.toLowerCase() === "y") {
    const names = ["Alex", "Jordan", "Sam"];
    for (const n of names) {
      const uid = nextId();
      state.users[uid] = { uid, name: n, points: 0 };
      state.group.memberIds.push(uid);
    }
    console.log(green(`\n  Added ${names.join(", ")} to the group!\n`));
  }
  addSystemMsg(`${state.currentUser.name} created the group "${state.group.name}"`);
}

async function screenProposeGoal() {
  separator("PROPOSE A GOAL");
  const title = await ask("  Goal title (e.g. Gym 3x this week): ");
  if (!title.trim()) { console.log(red("  Cancelled.\n")); return; }

  console.log("\n  Difficulty tier:");
  console.log(`    1. ${green("Easy")}   — 1 pt per check-in, +2 completion bonus`);
  console.log(`    2. ${yellow("Medium")} — 3 pts per check-in, +5 completion bonus`);
  console.log(`    3. ${red("Hard")}   — 5 pts per check-in, +10 completion bonus`);
  const tierChoice = await ask("\n  Pick tier (1/2/3): ");
  const tiers = ["easy", "medium", "hard"];
  const tier = tiers[parseInt(tierChoice) - 1] ?? "medium";

  const targetStr = await ask("  How many check-ins to complete the goal? (default 3): ");
  const target = parseInt(targetStr) || 3;

  // Pick participants
  const members = state.group.memberIds.map(uid => state.users[uid]);
  console.log("\n  Add participants:");
  members.forEach((u, i) => {
    const you = u.uid === state.currentUser.uid ? " (you)" : "";
    console.log(`    ${i+1}. ${u.name}${you}`);
  });
  const pickedStr = await ask("  Enter numbers separated by commas (e.g. 1,2,3): ");
  const picked = pickedStr.split(",").map(s => parseInt(s.trim()) - 1)
    .filter(i => i >= 0 && i < members.length)
    .map(i => members[i].uid);
  const participantIds = picked.length ? [...new Set([state.currentUser.uid, ...picked])] : [state.currentUser.uid];

  const goalId = nextId();
  const approvalsNeeded = Math.max(1, Math.ceil(participantIds.length / 2));
  state.goals[goalId] = {
    id: goalId,
    title: title.trim(),
    tier,
    pointsPerCheckin: TIER[tier].pointsPerCheckin,
    completionBonus: TIER[tier].completionBonus,
    participants: participantIds,
    target,
    approvalsNeeded,
    approvals: [state.currentUser.uid],
    status: participantIds.length === 1 ? "active" : "proposed",
  };

  state.messages.push({ type: "goal", author: state.currentUser.name, refId: goalId });

  if (state.goals[goalId].status === "proposed") {
    console.log(yellow(`\n  Goal proposed! Needs ${approvalsNeeded} approval(s) to go active.\n`));
    addSystemMsg(`${state.currentUser.name} proposed a goal: "${title}" [${tier}] — needs approvals`);
  } else {
    console.log(green(`\n  Goal is live! (solo goal — active immediately)\n`));
    addSystemMsg(`Goal "${title}" is now active!`);
  }
}

async function screenApproveGoals() {
  const proposed = Object.values(state.goals).filter(g => g.status === "proposed");
  if (!proposed.length) { console.log(yellow("\n  No pending goal approvals.\n")); return; }

  separator("APPROVE GOALS");
  for (const g of proposed) {
    if (!g.participants.includes(state.currentUser.uid)) continue;
    if (g.approvals.includes(state.currentUser.uid)) {
      console.log(dim(`  "${g.title}" — you already approved this.\n`)); continue;
    }
    const tierColor = g.tier === "hard" ? red : g.tier === "medium" ? yellow : green;
    console.log(`\n  ${bold(g.title)}  [${tierColor(g.tier)}]  ${g.pointsPerCheckin}pt per check-in`);
    console.log(`  Approvals: ${g.approvals.length}/${g.approvalsNeeded}`);
    const ans = await ask("  Approve this goal? (y/n): ");
    if (ans.toLowerCase() === "y") {
      g.approvals.push(state.currentUser.uid);
      if (g.approvals.length >= g.approvalsNeeded) {
        g.status = "active";
        addSystemMsg(`Goal "${g.title}" has been approved and is now active!`);
        console.log(green("  Goal approved and now active! 🎯\n"));
      } else {
        console.log(yellow(`  Approved! Still needs ${g.approvalsNeeded - g.approvals.length} more.\n`));
      }
    }
  }
}

async function screenCheckin() {
  const myGoals = Object.values(state.goals).filter(
    g => g.status === "active" && g.participants.includes(state.currentUser.uid)
  );
  if (!myGoals.length) { console.log(yellow("\n  No active goals to check into.\n")); return; }

  separator("CHECK IN");
  myGoals.forEach((g, i) => {
    const done = Object.values(state.checkins).filter(
      ci => ci.goalId === g.id && ci.userId === state.currentUser.uid
    ).length;
    const tierColor = g.tier === "hard" ? red : g.tier === "medium" ? yellow : green;
    console.log(`  ${i+1}. ${bold(g.title)}  [${tierColor(g.tier)}]  ${dim(`${done}/${g.target} check-ins`)}`);
  });
  const choice = await ask("\n  Pick goal number: ");
  const goal = myGoals[parseInt(choice) - 1];
  if (!goal) { console.log(red("  Invalid choice.\n")); return; }

  // Simulate camera capture
  process.stdout.write("\n  📸  Opening camera");
  for (let i = 0; i < 3; i++) { await pause(400); process.stdout.write("..."); }
  console.log(green(" Photo captured!\n"));

  const checkinId = nextId();
  state.checkins[checkinId] = {
    id: checkinId,
    goalId: goal.id,
    goalTitle: goal.title,
    userId: state.currentUser.uid,
    status: "pending",
    votes: [],
  };
  state.messages.push({ type: "checkin", author: state.currentUser.name, refId: checkinId });
  addSystemMsg(`${state.currentUser.name} submitted a check-in for "${goal.title}" — needs verification`);

  // If only 1 participant, auto-verify
  if (goal.participants.length === 1) {
    state.checkins[checkinId].votes.push({ userId: "system", vote: "approve" });
    resolveCheckin(checkinId);
    console.log(green(`  Auto-verified (solo goal)! +${state.checkins[checkinId].awardedPoints} pts 🎉\n`));
  } else {
    console.log(yellow(`  Check-in submitted! Waiting for group verification.\n`));
    console.log(dim(`  (Switch to another user and use "Vote on pending check-ins")\n`));
  }
}

async function screenVote() {
  const pending = Object.values(state.checkins).filter(
    ci => {
      if (ci.status !== "pending") return false;
      if (ci.userId === state.currentUser.uid) return false;
      const goal = state.goals[ci.goalId];
      if (!goal?.participants.includes(state.currentUser.uid)) return false;
      if (ci.votes.some(v => v.userId === state.currentUser.uid)) return false;
      return true;
    }
  );

  if (!pending.length) { console.log(yellow("\n  No check-ins waiting for your vote.\n")); return; }

  separator("VOTE ON CHECK-INS");
  for (const ci of pending) {
    const submitter = state.users[ci.userId];
    const goal = state.goals[ci.goalId];
    const tierColor = goal?.tier === "hard" ? red : goal?.tier === "medium" ? yellow : green;
    const ap = ci.votes.filter(v => v.vote === "approve").length;
    const rj = ci.votes.filter(v => v.vote === "reject").length;

    console.log(`\n  ${bold(submitter?.name)} checked in for: ${bold(ci.goalTitle)}`);
    console.log(`  Tier: ${tierColor(goal?.tier ?? "?")}   Current votes: ${green(ap + " approve")}  ${red(rj + " reject")}`);
    console.log(dim("  (In the real app you'd see their photo here)"));
    const ans = await ask("  Approve or reject? (a/r): ");

    if (ans.toLowerCase() === "a" || ans.toLowerCase() === "r") {
      const vote = ans.toLowerCase() === "a" ? "approve" : "reject";
      ci.votes.push({ userId: state.currentUser.uid, vote });
      resolveCheckin(ci.id);
      if (ci.status === "verified") {
        console.log(green(`  ✓ Approved! ${state.users[ci.userId]?.name} earned ${ci.awardedPoints} pts.\n`));
      } else if (ci.status === "rejected") {
        console.log(red(`  ✗ Rejected. No points awarded.\n`));
      } else {
        console.log(yellow(`  Vote recorded. Waiting for more votes.\n`));
      }
    }
  }
}

async function screenCatalog() {
  separator("REWARDS & PUNISHMENTS CATALOG");
  const myPoints = state.currentUser.points;
  console.log(`  Your balance: ${bold(myPoints + " pts")}\n`);

  console.log(red("  PUNISHMENTS"));
  const punishments = state.catalog.filter(c => c.type === "punishment");
  punishments.forEach((item, i) =>
    console.log(`    ${i+1}. ${item.title.padEnd(48)} ${item.cost <= myPoints ? green(item.cost + " pts") : dim(item.cost + " pts")}`)
  );
  console.log();
  console.log(mag("  REWARDS"));
  const rewards = state.catalog.filter(c => c.type === "reward");
  rewards.forEach((item, i) =>
    console.log(`    ${punishments.length + i + 1}. ${item.title.padEnd(48)} ${item.cost <= myPoints ? green(item.cost + " pts") : dim(item.cost + " pts")}`)
  );

  const allAffordable = [...punishments, ...rewards].filter(c => c.cost <= myPoints);
  if (!allAffordable.length) {
    console.log(dim("\n  Earn more points to unlock redemptions.\n")); return;
  }

  const choice = await ask(`\n  Enter item number to redeem (or Enter to skip): `);
  const allItems = [...punishments, ...rewards];
  const item = allItems[parseInt(choice) - 1];
  if (!item) { console.log(dim("  Skipped.\n")); return; }
  if (item.cost > myPoints) { console.log(red("  Not enough points!\n")); return; }

  state.currentUser.points -= item.cost;
  const redemption = { title: item.title, type: item.type, cost: item.cost, by: state.currentUser.name };
  state.messages.push({ type: "redemption", author: state.currentUser.name, redemption });
  addSystemMsg(`${state.currentUser.name} redeemed "${item.title}" for ${item.cost} pts!`);
  console.log(mag(`\n  🎉 Redeemed: ${bold(item.title)}\n  Group has been notified!\n`));
}

// ─── Main menu ─────────────────────────────────────────────────────────────

async function mainMenu() {
  while (true) {
    const pendingVotes = Object.values(state.checkins).filter(
      ci => ci.status === "pending" && ci.userId !== state.currentUser?.uid
        && state.goals[ci.goalId]?.participants.includes(state.currentUser?.uid)
        && !ci.votes.some(v => v.userId === state.currentUser?.uid)
    ).length;
    const pendingApprovals = Object.values(state.goals).filter(
      g => g.status === "proposed"
        && g.participants.includes(state.currentUser?.uid)
        && !g.approvals.includes(state.currentUser?.uid)
    ).length;

    separator(`STAKEUP — ${state.group?.name ?? ""}  |  ${state.currentUser?.name}  |  ${state.currentUser?.points ?? 0} pts`);

    console.log(`  ${cyan("1.")} View group chat`);
    console.log(`  ${cyan("2.")} View scoreboard`);
    console.log(`  ${cyan("3.")} View active goals`);
    console.log(`  ${cyan("4.")} Propose a new goal`);
    console.log(`  ${cyan("5.")} Approve pending goals${pendingApprovals ? yellow(` (${pendingApprovals} waiting)`) : ""}`);
    console.log(`  ${cyan("6.")} Check in to a goal`);
    console.log(`  ${cyan("7.")} Vote on check-ins${pendingVotes ? yellow(` (${pendingVotes} waiting)`) : ""}`);
    console.log(`  ${cyan("8.")} Browse catalog & redeem`);
    console.log(`  ${cyan("9.")} Switch user`);
    console.log(`  ${cyan("0.")} Quit`);
    console.log();

    const choice = await ask("  → ");
    console.log();

    switch (choice.trim()) {
      case "1": printChat(); break;
      case "2": printScoreboard(); break;
      case "3": printGoals(); break;
      case "4": await screenProposeGoal(); break;
      case "5": await screenApproveGoals(); break;
      case "6": await screenCheckin(); break;
      case "7": await screenVote(); break;
      case "8": await screenCatalog(); break;
      case "9": await screenLogin(); break;
      case "0": console.log(cyan("\n  See you later! 👋\n")); rl.close(); process.exit(0);
      default: console.log(dim("  Unknown option.\n"));
    }
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────

(async () => {
  console.clear();
  console.log(`\n${bold(cyan("  ███████╗████████╗ █████╗ ██╗  ██╗███████╗██╗   ██╗██████╗"))}`);
  console.log(`${bold(cyan("  ██╔════╝╚══██╔══╝██╔══██╗██║ ██╔╝██╔════╝██║   ██║██╔══██╗"))}`);
  console.log(`${bold(cyan("  ███████╗   ██║   ███████║█████╔╝ █████╗  ██║   ██║██████╔╝"))}`);
  console.log(`${bold(cyan("  ╚════██║   ██║   ██╔══██║██╔═██╗ ██╔══╝  ██║   ██║██╔═══╝ "))}`);
  console.log(`${bold(cyan("  ███████║   ██║   ██║  ██║██║  ██╗███████╗╚██████╔╝██║     "))}`);
  console.log(`${bold(cyan("  ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝     "))}\n`);
  console.log(dim("  Keep your friends accountable — for real.\n"));
  await pause(500);

  await screenLogin();
  await screenSetupGroup();
  await mainMenu();
})();
