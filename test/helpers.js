const { addDays } = require('../src/core/stats');

// Deterministic synthetic athlete: steady baseline, an easy 40-minute run every other day.
function syntheticData({ end = '2026-10-22', length = 45, overrides = {} } = {}) {
  const start = addDays(end, -(length - 1));
  const days = [];
  const activities = [];
  for (let i = 0; i < length; i++) {
    const date = addDays(start, i);
    const wobble = [0, 1, -1, 2, -2, 1, -1][i % 7];
    days.push({
      date,
      restingHr: 54 + (wobble > 0 ? 1 : wobble < 0 ? -1 : 0),
      hrvLastNight: 66 + wobble * 2,
      hrvWeeklyAvg: 66,
      hrvStatus: 'BALANCED',
      hrvBalancedLow: 56,
      hrvBalancedHigh: 73,
      sleepSeconds: 7.5 * 3600,
      sleepScore: 80,
      bodyBatteryWake: 75,
      ...(overrides[date] || {}),
    });
    if (i % 2 === 0 && date < end) {
      activities.push({
        start: `${date}T08:00:00`,
        type: 'running',
        durationS: 2400,
        distanceM: 6000,
        avgHr: 140,
        maxHr: 155,
        aerobicTe: 2.8,
        label: 'AEROBIC_BASE',
        zoneSeconds: [300, 1500, 600, 0, 0],
      });
    }
  }
  return { source: 'synthetic', days, activities };
}

module.exports = { syntheticData };
