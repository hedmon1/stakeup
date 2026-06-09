/**
 * Seed the global catalog collection. Run once after setting up Firebase.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *     npx ts-node scripts/seed-catalog.ts
 */
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const items = [
  // Punishments
  { title: "Group does 50 pushups on camera", description: "Everyone films themselves doing 50 pushups and posts to the chat within 24h.", type: "punishment", pointsCost: 15 },
  { title: "Vlog a day in your life", description: "Every member films a short day-in-the-life vlog and shares it with the group.", type: "punishment", pointsCost: 40 },
  { title: "Loser wears a costume to dinner", description: "Lowest-points member shows up to next group dinner in a costume picked by the redeemer.", type: "punishment", pointsCost: 25 },
  { title: "Cold-plunge or ice bath", description: "Every member does a 2-minute cold plunge / ice bath and films it.", type: "punishment", pointsCost: 30 },
  { title: "No phone for 12 hours", description: "Each member goes 12 hours without their phone — proof: screen-time screenshot.", type: "punishment", pointsCost: 35 },
  { title: "Sing in public", description: "Each member films themselves singing a chorus of a song in a public place.", type: "punishment", pointsCost: 25 },
  { title: "Group run, redeemer picks the distance", description: "Group meets for a run; redeemer chooses the distance (max 10K).", type: "punishment", pointsCost: 20 },
  { title: "Spicy food challenge", description: "Each member eats a spicy snack of redeemer's choice on camera.", type: "punishment", pointsCost: 20 },
  { title: "Embarrassing profile picture for a week", description: "Each member changes their social media PFP to one the redeemer picks for 7 days.", type: "punishment", pointsCost: 30 },
  { title: "Mystery box dinner", description: "Each member cooks a meal using 3 ingredients chosen by the redeemer.", type: "punishment", pointsCost: 25 },
  { title: "Group cold shower week", description: "Every member takes a cold shower every day for a week.", type: "punishment", pointsCost: 45 },

  // Rewards
  { title: "Group chips in $20 each toward redeemer's wishlist", description: "Each non-redeemer member sends $20 toward something the redeemer wants.", type: "reward", pointsCost: 50 },
  { title: "Redeemer picks next hangout activity", description: "No vetoes — group does whatever the redeemer chooses next.", type: "reward", pointsCost: 20 },
  { title: "Group hype video", description: "Group makes a 60-second hype edit about the redeemer.", type: "reward", pointsCost: 30 },
  { title: "Free pass on next missed check-in", description: "Redeemer can skip one check-in this week without losing points.", type: "reward", pointsCost: 15 },
  { title: "Group buys winner an AirPod fund", description: "Each member contributes equally toward the cost of new AirPods.", type: "reward", pointsCost: 75 },
  { title: "Personal cheerleader for a week", description: "Group sends the redeemer one piece of hype/encouragement every day for a week.", type: "reward", pointsCost: 20 },
  { title: "Group does redeemer's chore", description: "Group collectively handles one chore the redeemer hates (dishes, laundry, etc).", type: "reward", pointsCost: 25 },
  { title: "Crown emoji on your name in chat", description: "Redeemer gets a 👑 next to their name in the group for a full week.", type: "reward", pointsCost: 10 },
  { title: "Group buys the next meal out", description: "Group covers the redeemer's bill at the next meal out together.", type: "reward", pointsCost: 60 },
];

async function run() {
  for (const item of items) {
    await db.collection("catalog").add({ ...item, suggestedProof: "photo" });
    console.log("seeded:", item.title);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
