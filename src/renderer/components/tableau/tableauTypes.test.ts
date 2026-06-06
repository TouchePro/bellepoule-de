import { describe, it, expect } from 'vitest';
import { propagateWinners, TableauMatch } from './tableauTypes';

const F = (id: string) => ({ id, firstName: id, lastName: id } as any);

function mk(round: number, pos: number, a: any, b: any, o: Partial<TableauMatch> = {}): TableauMatch {
  const isBye = o.isBye ?? (!a || !b);
  return {
    id: `${round}-${pos}`,
    round,
    position: pos,
    fencerA: a,
    fencerB: b,
    scoreA: o.scoreA ?? null,
    scoreB: o.scoreB ?? null,
    winner: o.winner ?? (isBye ? a || b : null),
    isBye,
  };
}

describe('propagateWinners', () => {
  // Régression : un vainqueur doit affronter son adversaire réel même quand
  // matchList n'est pas ordonné par position (restauration DB / synchro tablette).
  it('apparie les feeders par position même si matchList est désordonné', () => {
    const dk = F('DK');
    const toad = F('Toad');
    const bowser = F('Bowser');

    const matches: TableauMatch[] = [
      mk(8, 1, toad, bowser),
      mk(8, 3, F('z'), F('w')),
      mk(8, 0, dk, null), // bye
      mk(8, 2, F('x'), F('y')),
      mk(4, 1, null, null, { isBye: false }),
      mk(4, 0, null, null, { isBye: false }),
      mk(2, 0, null, null, { isBye: false }),
    ];

    const m81 = matches.find(m => m.id === '8-1')!;
    m81.scoreA = 0;
    m81.scoreB = 15;
    m81.winner = bowser;

    propagateWinners(matches, 8);

    const semi = matches.find(m => m.id === '4-0')!;
    expect(semi.fencerA?.id).toBe('DK');
    expect(semi.fencerB?.id).toBe('Bowser');
  });
});
