import type { Equipment } from '../../shared/types.ts'

export interface ProjectMatch {
  equipment: Equipment
  score: number
  classification: 'essential' | 'optional'
  reasons: string[]
  matchedCapabilities: string[]
  requestedCapabilities: string[]
  scoreBreakdown: {
    baseline: number
    requestedCapabilities: number
    inferredCapabilities: number
    catalogueEvidence: number
    availabilityAdjustment: number
  }
}

export interface ProjectMatcher {
  readonly method: 'transparent-rules'
  match(description: string, catalogue: Equipment[]): ProjectMatch[]
}

interface Capability {
  id: string
  label: string
  projectTerms: string[]
  resourceTerms: string[]
  related?: string[]
}

const CAPABILITIES: Capability[] = [
  {
    id: 'robotics',
    label: 'Robotics',
    projectTerms: ['robot', 'robotics', 'autonomous', 'agricultural', 'agriculture', 'rover', 'navigation'],
    resourceTerms: ['robotics', 'robot', 'ros', 'mobile', 'lidar', 'cobot', 'arm'],
    related: ['sensing', 'embedded', 'computing'],
  },
  {
    id: 'sensing',
    label: 'Sensors & perception',
    projectTerms: ['sensor', 'sensors', 'perception', 'lidar', 'camera', 'cameras', 'imaging', 'imu'],
    resourceTerms: ['sensor', 'lidar', 'camera', 'imu', 'tof', 'dht', 'imaging', 'rplidar', 'oak d'],
    related: ['embedded', 'computing', 'optics'],
  },
  {
    id: 'embedded',
    label: 'Embedded systems',
    projectTerms: ['embedded', 'microcontroller', 'arduino', 'raspberry pi', 'raspberry', 'firmware', 'iot', 'edge'],
    resourceTerms: ['embedded', 'arduino', 'raspberry pi', 'microcontroller', 'iot', 'edge computing', 'zynq'],
  },
  {
    id: 'workstation',
    label: 'Workstation',
    projectTerms: ['workstation', 'workstations', 'lab workstation'],
    resourceTerms: ['workstation', 'gpu workstation', 'ai lab', 'render node'],
    related: ['computing'],
  },
  {
    id: 'computing',
    label: 'Compute & workstation',
    projectTerms: ['gpu', 'compute', 'computer vision', 'simulation', 'training', 'inference', 'machine learning', 'deep learning'],
    resourceTerms: ['computing', 'workstation', 'gpu', 'cpu', 'simulation', 'inference', 'render node', 'ai lab'],
  },
  {
    id: 'measurement',
    label: 'Testing & measurement',
    projectTerms: ['testing', 'test', 'measurement', 'debug', 'oscilloscope', 'logic analyser', 'logic analyzer', 'signals', 'calibration', 'instrumentation'],
    resourceTerms: ['oscilloscope', 'scope', 'logic analyser', 'logic analyzer', 'signals', 'calibration', 'debug'],
  },
  {
    id: 'fabrication',
    label: 'Fabrication & prototyping',
    projectTerms: ['prototype', 'prototyping', 'fabrication', 'fabricate', '3d print', '3d printing', 'cnc', 'machining', 'housing'],
    resourceTerms: ['3d printing', 'printer', 'cnc', 'fabrication', 'maker', 'prototype', 'mill'],
  },
  {
    id: 'optics',
    label: 'Optics & imaging',
    projectTerms: ['optics', 'microscope', 'microscopy', 'image capture', 'optical'],
    resourceTerms: ['optics', 'microscope', 'camera capture', 'bioimaging', 'imaging'],
  },
  {
    id: 'digital-design',
    label: 'Digital design',
    projectTerms: ['fpga', 'rtl', 'digital design', 'hardware acceleration', 'vlsi'],
    resourceTerms: ['fpga', 'digital design', 'zynq', 'artix', 'rtl', 'vlsi'],
  },
]

const STOP_WORDS = new Set([
  'about', 'across', 'after', 'also', 'and', 'are', 'build', 'building', 'for', 'from', 'have',
  'i', 'in', 'into', 'is', 'it', 'need', 'of', 'on', 'our', 'project', 'require', 'the', 'this',
  'to', 'use', 'using', 'want', 'with', 'would',
])

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function containsTerm(text: string, term: string) {
  const normalizedText = ` ${normalize(text)} `
  const normalizedTerm = ` ${normalize(term)} `
  return normalizedText.includes(normalizedTerm)
}

function resourceText(equipment: Equipment) {
  return normalize([
    equipment.name,
    equipment.category,
    equipment.department,
    equipment.location,
    equipment.description,
    equipment.tags.join(' '),
    ...Object.entries(equipment.specs).flat(),
  ].join(' '))
}

function projectKeywords(description: string) {
  return [...new Set(normalize(description).split(' ').filter((word) => word.length > 2 && !STOP_WORDS.has(word)))]
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

export class RuleBasedProjectMatcher implements ProjectMatcher {
  readonly method = 'transparent-rules' as const

  match(description: string, catalogue: Equipment[]): ProjectMatch[] {
    const brief = normalize(description)
    if (!brief) return []

    const requested = CAPABILITIES.filter((capability) =>
      capability.projectTerms.some((term) => containsTerm(brief, term)),
    )
    const inferredIds = new Set(requested.flatMap((capability) => capability.related ?? []))
    const inferred = CAPABILITIES.filter(
      (capability) => inferredIds.has(capability.id) && !requested.some((item) => item.id === capability.id),
    )
    const keywords = projectKeywords(description)

    return catalogue
      .map((equipment) => {
        const catalogueText = resourceText(equipment)
        const requestedMatches = requested.filter((capability) =>
          capability.resourceTerms.some((term) => containsTerm(catalogueText, term)),
        )
        const inferredMatches = inferred.filter((capability) =>
          capability.resourceTerms.some((term) => containsTerm(catalogueText, term)),
        )
        const directMatches = keywords.filter((keyword) => containsTerm(catalogueText, keyword))
        if (!requestedMatches.length && !inferredMatches.length && !directMatches.length) return null

        const baseline = 8
        const availabilityAdjustment = equipment.status === 'available' ? 6 : equipment.status === 'maintenance' ? -18 : 0
        const requestedPoints = Math.min(requestedMatches.length, 3) * 18
        const inferredPoints = Math.min(inferredMatches.length, 2) * 8
        const cataloguePoints = Math.min(directMatches.length, 4) * 4
        const score = clampScore(baseline + requestedPoints + inferredPoints + cataloguePoints + availabilityAdjustment)
        const matchedCapabilities = [...requestedMatches, ...inferredMatches].map((capability) => capability.label)
        const reasons: string[] = []

        if (requestedMatches.length) {
          reasons.push(`Directly supports ${requestedMatches.map((capability) => capability.label.toLowerCase()).join(' and ')} in your brief.`)
        } else if (inferredMatches.length) {
          reasons.push(`Useful supporting capability: ${inferredMatches.map((capability) => capability.label.toLowerCase()).join(' and ')}.`)
        }
        if (directMatches.length) {
          reasons.push(`Catalogue evidence: ${directMatches.slice(0, 3).join(', ')}.`)
        }
        reasons.push(
          equipment.status === 'available'
            ? `Listed as available in ${equipment.department}.`
            : equipment.status === 'maintenance'
              ? `Owned by ${equipment.department}; currently in maintenance.`
              : `Owned by ${equipment.department}; currently in use, so check the live calendar.`,
        )

        return {
          equipment,
          score,
          classification: requestedMatches.length || directMatches.length ? 'essential' : 'optional',
          reasons,
          matchedCapabilities,
          requestedCapabilities: requestedMatches.map((capability) => capability.label),
          scoreBreakdown: {
            baseline,
            requestedCapabilities: requestedPoints,
            inferredCapabilities: inferredPoints,
            catalogueEvidence: cataloguePoints,
            availabilityAdjustment,
          },
        }
      })
      .filter((match): match is ProjectMatch => match !== null)
      .sort((a, b) => {
        if (a.classification !== b.classification) return a.classification === 'essential' ? -1 : 1
        return b.score - a.score
      })
  }
}

export const projectMatcher: ProjectMatcher = new RuleBasedProjectMatcher()

export function selectResourceMatches(matches: ProjectMatch[], maximum = 6) {
  const selected: ProjectMatch[] = []
  const selectedIds = new Set<string>()
  const coveredCapabilities = new Set<string>()

  while (selected.length < maximum) {
    const next = matches
      .filter((match) => !selectedIds.has(match.equipment.id))
      .map((match) => ({
        match,
        newCapabilities: match.requestedCapabilities.filter((capability) => !coveredCapabilities.has(capability)),
      }))
      .sort((a, b) => {
        if (a.newCapabilities.length !== b.newCapabilities.length) {
          return b.newCapabilities.length - a.newCapabilities.length
        }
        return b.match.score - a.match.score
      })[0]

    if (!next || next.newCapabilities.length === 0) break
    selected.push(next.match)
    selectedIds.add(next.match.equipment.id)
    next.newCapabilities.forEach((capability) => coveredCapabilities.add(capability))
  }

  for (const match of matches) {
    if (selected.length >= maximum) break
    if (selectedIds.has(match.equipment.id)) continue
    selected.push(match)
    selectedIds.add(match.equipment.id)
  }

  return selected.sort((a, b) => {
    if (a.classification !== b.classification) return a.classification === 'essential' ? -1 : 1
    return b.score - a.score
  })
}
