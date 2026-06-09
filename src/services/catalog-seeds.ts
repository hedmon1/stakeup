import { CatalogItem } from '../types';

export const CATALOG_SEEDS: Omit<CatalogItem, 'id'>[] = [
  // ── Punishments ────────────────────────────────────────────────────────────
  { title: 'Group does 50 pushups',          description: 'Everyone in the group does 50 pushups, posted as video in chat.',                type: 'punishment', pointsCost: 15 },
  { title: 'Loser wears a costume to dinner', description: 'Bottom of the leaderboard wears a costume to the next group hangout.',           type: 'punishment', pointsCost: 25 },
  { title: 'Vlog a day in your life',         description: 'Each member records and shares a short vlog of one full day.',                    type: 'punishment', pointsCost: 40 },
  { title: 'No phone for 3 hours',            description: 'Everyone goes phoneless for a 3-hour block, proof via group photo before/after.', type: 'punishment', pointsCost: 30 },
  { title: 'Cold shower challenge',           description: 'Everyone does a 60-second cold shower, posted to chat.',                          type: 'punishment', pointsCost: 20 },
  { title: 'Embarrassing Instagram story',    description: 'Each member posts an embarrassing throwback for 24 hours.',                       type: 'punishment', pointsCost: 35 },
  { title: 'Public karaoke',                  description: 'Group does karaoke at a public spot. Video required.',                            type: 'punishment', pointsCost: 50 },
  { title: 'Eat the spiciest thing',          description: 'Everyone tries the spiciest thing available, reactions on camera.',               type: 'punishment', pointsCost: 30 },
  { title: 'No social media for 24h',         description: 'Group-wide social media blackout for one day.',                                   type: 'punishment', pointsCost: 25 },
  { title: 'Wake up at 5am',                  description: 'Whole group wakes up at 5am and sends a selfie in the group chat.',               type: 'punishment', pointsCost: 35 },

  // ── Rewards ────────────────────────────────────────────────────────────────
  { title: 'Group buys you dinner',            description: 'Each member chips in for a meal at the redeemer’s favorite spot.',              type: 'reward', pointsCost: 60 },
  { title: 'You pick the next hangout',        description: 'Redeemer chooses the next group activity — no vetoes allowed.',                 type: 'reward', pointsCost: 20 },
  { title: 'Hype video',                       description: 'Group makes a hype/highlight video about the redeemer.',                        type: 'reward', pointsCost: 30 },
  { title: 'Group chips in $20 each',          description: 'Toward something on your wishlist. Show what you bought.',                      type: 'reward', pointsCost: 75 },
  { title: 'Skip a punishment',                description: 'Redeemer is exempt from the next group punishment.',                            type: 'reward', pointsCost: 40 },
  { title: 'Choose someone’s next goal',       description: 'Redeemer picks one goal that another member has to commit to next week.',       type: 'reward', pointsCost: 25 },
  { title: 'Personal trainer for a session',   description: 'Group covers a personal training session for the redeemer.',                    type: 'reward', pointsCost: 80 },
  { title: 'Movie night, redeemer picks',      description: 'Group movie night, the redeemer picks the movie and snacks.',                   type: 'reward', pointsCost: 25 },
  { title: 'Chef’s choice (group cooks)',      description: 'Other members cook a meal of the redeemer’s choice.',                           type: 'reward', pointsCost: 45 },
  { title: 'Brag rights for a week',           description: 'Bragging privileges; nobody else can claim top spot for 7 days.',               type: 'reward', pointsCost: 15 },
];
