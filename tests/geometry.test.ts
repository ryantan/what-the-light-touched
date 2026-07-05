import { describe, it, expect } from 'vitest'
import { pointInPolygon } from '../src/engine/geometry'

const square: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]]

describe('pointInPolygon', () => {
  it('detects inside and outside points', () => {
    expect(pointInPolygon([5, 5], square)).toBe(true)
    expect(pointInPolygon([15, 5], square)).toBe(false)
    expect(pointInPolygon([-1, -1], square)).toBe(false)
  })

  it('works for non-convex polygons', () => {
    const lShape: [number, number][] = [[0, 0], [10, 0], [10, 5], [5, 5], [5, 10], [0, 10]]
    expect(pointInPolygon([2, 8], lShape)).toBe(true)
    expect(pointInPolygon([8, 8], lShape)).toBe(false)
  })
})
