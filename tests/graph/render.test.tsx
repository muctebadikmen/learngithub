import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { run, write, addF, commitM } from '../engine/helpers';
import { reduce } from '../../src/engine/reduce';
import { layout } from '../../src/layout/layout';
import { GitGraph } from '../../src/graph/GitGraph';

describe('GitGraph render', () => {
  it('draws one circle per commit and one path per edge', () => {
    const s = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      write('a.txt', '2'), addF('a.txt'), commitM('c2'),
      { cmd: 'switch', target: 'feature', create: true },
      write('b.txt', 'f'), addF('b.txt'), commitM('F'),
    ]);
    const model = layout(s);
    const svg = renderToStaticMarkup(<GitGraph model={model} />);
    const circles = svg.match(/<circle/g) ?? [];
    const paths = svg.match(/<path/g) ?? [];
    expect(circles.length).toBe(model.nodes.length);
    expect(paths.length).toBe(model.edges.length);
    expect(svg).toContain('c1');
    expect(svg).toContain('feature');
    expect(svg).toContain('HEAD');
    // lock the horizontal orientation: commit F is at row 2, lane 0 → cx=nodeX(2)=320, cy=nodeY(0)=72.
    // (a re-flip to vertical would put F at cx=56, cy=272 and fail this.)
    expect(svg).toContain('cx="320" cy="72"');
  });

  it('marks a ghost commit with reduced opacity', () => {
    const s0 = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      write('a.txt', '2'), addF('a.txt'), commitM('c2'),
    ]);
    const s = reduce(s0, { cmd: 'reset', mode: 'hard', target: 'HEAD~1' }).state;
    const svg = renderToStaticMarkup(<GitGraph model={layout(s)} />);
    expect(svg).toMatch(/opacity/); // ghost styling present
  });

  it('renders a hint for an empty repo without throwing', () => {
    const s = reduce(run([]), { cmd: 'init' }).state;
    const svg = renderToStaticMarkup(<GitGraph model={layout(s)} />);
    expect(svg).toContain('no commits yet');
  });
});

describe('GitGraph — label edge cases', () => {
  it('grows the top margin so stacked ref pills on a lane-0 commit never clip', () => {
    // three branches on the very first commit (lane 0) — worst case for top clipping
    const s = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      { cmd: 'branch', name: 'b1' },
      { cmd: 'branch', name: 'b2' },
    ]);
    const svg = renderToStaticMarkup(<GitGraph model={layout(s)} />);
    expect(svg).toContain('main');
    expect(svg).toContain('b1');
    expect(svg).toContain('b2');
    // viewBox = "minX minY width height"; minY must be pulled above 0 to fit the 3-pill stack.
    const vb = svg.match(/viewBox="([^"]+)"/)![1].split(' ').map(Number);
    expect(vb[1]).toBeLessThan(0);
  });

  it('renders a detached-HEAD marker alongside a co-located branch pill', () => {
    const s0 = run([
      write('a.txt', '1'), addF('a.txt'), commitM('c1'),
      write('a.txt', '2'), addF('a.txt'), commitM('c2'),
    ]);
    const tip = s0.branches['main'];
    const s = reduce(s0, { cmd: 'switch', target: tip, detach: true }).state;
    const svg = renderToStaticMarkup(<GitGraph model={layout(s)} />);
    expect(svg).toContain('HEAD');     // detached marker
    expect(svg).toContain('main');     // branch pill on the same commit
    expect(svg).toContain('3 3');      // dashed outline of the HEAD marker
  });
});
