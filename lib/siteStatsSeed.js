// lib/siteStatsSeed.js — the stat the site shipped with before the admin panel
// existed. It is written into the database once, so the admin can edit, hide or
// delete it from Dashboard → Site Stats like any other stat.
import SiteStat from "@/models/SiteStat";

// Figures the hardcoded strip used to show
export const DEFAULT_PARTNER_STAT = {
  key: "partners_registered",
  label: "Partners Registered with Us (India)",
  note: "Growing steadily across India",
  value: 382,
  order: 0,
  isActive: true,
  autoGrow: { enabled: true, perDay: 1 },
};

// One attempt per server process. The products page and the admin page can both
// ask at the same moment, and without this they each run the whole check.
let seeding = null;

async function seedOnce() {
  const keyed = await SiteStat.find({ key: DEFAULT_PARTNER_STAT.key })
    .sort({ createdAt: 1 })
    .select("_id")
    .lean();

  // Clears up copies an earlier race left behind: the oldest one is kept, so
  // any edits the admin already made to it stay. This runs before the index
  // check below, because the unique index cannot be built while they exist.
  if (keyed.length > 1) {
    await SiteStat.deleteMany({
      _id: { $in: keyed.slice(1).map((d) => d._id) },
    });
  }

  // Wait for the unique index on "key" to exist. Without this the first few
  // requests on a fresh database can each insert a copy before Mongoose has
  // finished building it.
  try {
    await SiteStat.init();
  } catch (err) {
    // An index that cannot be built must not stop the strip from working
    console.error("Site stat index error:", err);
  }

  // The strip holds one stat. If there is already one — this default, the
  // admin's own, or a deleted record of it — nothing is added, so the default
  // can never come back and sit next to what the admin set up.
  if (keyed.length > 0) return;
  if (await SiteStat.exists({})) return;

  // Atomic: a second request that gets here writes nothing
  await SiteStat.findOneAndUpdate(
    { key: DEFAULT_PARTNER_STAT.key },
    {
      $setOnInsert: {
        ...DEFAULT_PARTNER_STAT,
        autoGrow: {
          ...DEFAULT_PARTNER_STAT.autoGrow,
          // Counted from the day it is created, so the figure starts at the
          // number above and climbs from there
          startDate: new Date(),
        },
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

// Creates the default stat the first time the strip is read. Safe to call on
// every request: it never adds a duplicate, and an admin who deletes it does
// not get it back.
export async function ensureDefaultSiteStats() {
  if (!seeding) {
    seeding = seedOnce().catch((err) => {
      // A duplicate key means another request seeded it first — nothing to do.
      // Anything else must not break the page the strip sits on, but the next
      // request is allowed to try again.
      if (err?.code !== 11000) {
        console.error("Site stat seed error:", err);
        seeding = null;
      }
    });
  }
  return seeding;
}
