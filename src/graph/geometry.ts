/** Grid→pixel geometry for the horizontal (left→right = time) commit graph. Pure; no DOM. */
export const COL_W = 132;  // horizontal distance between generations (row values)
export const LANE_H = 100; // vertical distance between lanes (branches)
export const NODE_R = 15;  // commit circle radius
export const MARGIN_X = 56;
export const MARGIN_Y = 72;

// Time flows left→right: a commit's generation (row) is its X, its branch line (lane) is its Y.
export const nodeX = (row: number): number => MARGIN_X + row * COL_W;
export const nodeY = (lane: number): number => MARGIN_Y + lane * LANE_H;

/** Lane accent palette, cycled by lane index. Lane 0 (the trunk) is emerald. */
export const LANE_COLORS = [
  '#34d399', // emerald — trunk / main
  '#60a5fa', // blue
  '#fbbf24', // amber
  '#c084fc', // violet
  '#f472b6', // pink
  '#22d3ee', // cyan
];
export const laneColor = (lane: number): string => LANE_COLORS[lane % LANE_COLORS.length];

/** Shorten a commit message so it fits under a node without colliding with neighbours. */
export const shortLabel = (message: string, max = 18): string =>
  message.length > max ? message.slice(0, max - 1) + '…' : message;
