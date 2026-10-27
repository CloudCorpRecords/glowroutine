'use strict';
/**
 * SAMPLE Skin AI results — clearly labeled demo data, NOT real analyses.
 * Shaped exactly like src/youcam.js normalizeResults() output so the
 * routine agent treats sample and live results identically.
 * Used until a live YOUCAM_API_KEY is configured (the free key arrives
 * as a redeem code emailed after Devpost registration for this hackathon).
 */
const PROFILES = {
  maya: {
    id: 'maya', name: 'Sample profile — Maya, 34',
    blurb: 'Combination skin, works outdoors, main worries: dark spots and midday shine.',
    source: 'sample',
    label: 'SAMPLE DATA — demo Skin AI result, not a real analysis',
    scores: { oiliness: 68, dryness: 34, wrinkles: 22, spots: 71, pores: 58, darkCircles: 40, acne: 18, redness: 25, firmnessLoss: 20, dullness: 44 },
    skinAge: 33,
  },
  jordan: {
    id: 'jordan', name: 'Sample profile — Jordan, 27',
    blurb: 'Oily, breakout-prone, gym five days a week, budget-conscious.',
    source: 'sample',
    label: 'SAMPLE DATA — demo Skin AI result, not a real analysis',
    scores: { oiliness: 82, dryness: 20, wrinkles: 8, spots: 30, pores: 74, darkCircles: 28, acne: 69, redness: 38, firmnessLoss: 6, dullness: 30 },
    skinAge: 26,
  },
  elena: {
    id: 'elena', name: 'Sample profile — Elena, 52',
    blurb: 'Dry and sensitive, main worries: fine lines, firmness, and winter tightness.',
    source: 'sample',
    label: 'SAMPLE DATA — demo Skin AI result, not a real analysis',
    scores: { oiliness: 18, dryness: 78, wrinkles: 64, spots: 45, pores: 30, darkCircles: 52, acne: 5, redness: 61, firmnessLoss: 66, dullness: 58 },
    skinAge: 54,
  },
};
module.exports = { PROFILES };
