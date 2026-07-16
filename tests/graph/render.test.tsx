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
