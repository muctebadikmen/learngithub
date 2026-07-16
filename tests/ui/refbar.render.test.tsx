import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { run, write, addF, commitM } from '../engine/helpers';
import { RefBar } from '../../src/ui/RefBar';

describe('RefBar render', () => {
  it('lists existing branches to switch to', () => {
    const s = run([write('a.txt', '1'), addF('a.txt'), commitM('c1'), { cmd: 'branch', name: 'feature' }]);
    const html = renderToStaticMarkup(<RefBar state={s} dispatch={() => []} />);
    expect(html).toContain('feature');
    expect(html).toContain('main');
  });
});
