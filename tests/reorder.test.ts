import { describe, expect, it } from 'vitest'
import { moveArrayItem } from '../app/utils/reorder'

describe('list reordering', () => {
  it('moves in both directions without mutating the source', () => {
    const source = ['a', 'b', 'c', 'd']
    expect(moveArrayItem(source, 0, 3)).toEqual(['b', 'c', 'd', 'a'])
    expect(moveArrayItem(source, 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(source).toEqual(['a', 'b', 'c', 'd'])
  })
  it.each([
    [-1, 1],
    [0, 5],
    [0, 0],
    [0.5, 1]
  ])('ignores invalid or unchanged positions %i to %i', (from, to) => {
    expect(moveArrayItem([1, 2, 3], from, to)).toEqual([1, 2, 3])
  })
})
