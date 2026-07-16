/** Grid→pixel geometry for the commit graph. Pure; no DOM. */
export const ROW_H = 76;   // vertical distance between rows
export const LANE_W = 60;  // horizontal distance between lanes
export const NODE_R = 13;  // commit circle radius
export const MARGIN_X = 44;
export const MARGIN_Y = 44;
export const LABEL_W = 220; // reserved space to the right for messages + pills

export const nodeX = (lane: number): number => MARGIN_X + lane * LANE_W;
export const nodeY = (row: number): number => MARGIN_Y + row * ROW_H;

/** Lane accent palette (Tailwind-ish hex), cycled by lane index. */
export const LANE_COLORS = [
  '#34d399', // emerald
  '#60a5fa', // blue
  '#fbbf24', // amber
  '#c084fc', // violet
  '#f472b6', // pink
  '#22d3ee', // cyan
];
export const laneColor = (lane: number): string => LANE_COLORS[lane % LANE_COLORS.length];
