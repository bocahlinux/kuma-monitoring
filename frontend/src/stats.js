export function computeStats(monitors) {
  let up = 0;
  let down = 0;
  for (const m of monitors) {
    if (m.live.statusLabel === 'up') up += 1;
    else if (m.live.statusLabel === 'down') down += 1;
  }
  return { up, down, total: monitors.length };
}
