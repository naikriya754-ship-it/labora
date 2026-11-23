import { describe, expect, it } from 'vitest'
import { equipment } from '../server/seed.ts'
import { RuleBasedProjectMatcher, selectResourceMatches } from '../src/lib/projectMatching.ts'

const matcher = new RuleBasedProjectMatcher()

describe('project resource matching', () => {
  it('finds robotics, sensing, and computing resources across departments', () => {
    const matches = matcher.match(
      'I am building an autonomous agricultural robot. I need robotics equipment, sensors and a testing workstation.',
      equipment,
    )
    const names = selectResourceMatches(matches, 6).map((match) => match.equipment.name)

    expect(names).toContain('TurtleBot4 Robotics Kit')
    expect(names).toContain('Arduino Kit Bench (×12)')
    expect(names).toContain('NVIDIA RTX A6000 Workstation')
    expect(names.some((name) => name.includes('Oscilloscope') || name.includes('Logic'))).toBe(true)
    expect(new Set(matches.map((match) => match.equipment.department)).size).toBeGreaterThan(1)
  })

  it('explains recommendations and bounds compatibility scores', () => {
    const matches = matcher.match('I need an FPGA board for digital design testing.', equipment)

    expect(matches[0]?.equipment.name).toBe('Xilinx PYNQ-Z2 FPGA Board')
    expect(matches[0]?.classification).toBe('essential')
    expect(matches[0]?.reasons.join(' ')).toContain('Directly supports')
    expect(matches.every((match) => match.score >= 0 && match.score <= 100)).toBe(true)
    expect(matches.every((match) => match.scoreBreakdown.requestedCapabilities >= 0)).toBe(true)
  })

  it('returns no matches for a brief with no catalogue signals', () => {
    expect(matcher.match('A study of medieval poetry and translation.', equipment)).toEqual([])
  })

  it('identifies the matching engine as transparent rules, not a language model', () => {
    expect(matcher.method).toBe('transparent-rules')
  })
})
