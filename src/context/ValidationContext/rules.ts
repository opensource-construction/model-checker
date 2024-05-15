// Utility functions that are used in the rules
import { PartialResult } from './interfaces.ts'

function extractAttributeValue({ content, regex }: ProcessContentChunkProps) {
  const match = content.match(regex)
  console.log('Extracted Value:', match ? match[1] : 'None') // This will show what is being extracted
  return match ? match[1] : undefined
}

function countElementsWithoutStorey({ content, regex }: ProcessContentChunkProps) {
  const unassignedDetails = [] as PartialResult[]
  let elementMatch

  while ((elementMatch = regex.exec(content)) !== null) {
    const elementCheck = elementMatch[0].match(/#(\d+)/)
    if (!elementCheck) continue

    const elementId = elementCheck[1]
    // Update to check if the element is contained in any spatial structure
    const containedRegex = new RegExp(
      `IFCRELCONTAINEDINSPATIALSTRUCTURE\\([^,]*,\\s*[^,]*,\\s*\\((?:[^)]*#)?${elementId}(?:,|\\))`,
      'gi',
    )

    if (!content.match(containedRegex)) {
      unassignedDetails.push({
        globalId: extractIFCAttribute({ content: elementMatch[0], position: 1 }), // Assuming the first quoted string after the match is the GlobalId
        name: extractIFCAttribute({ content: elementMatch[0], position: 3 }) || 'Unnamed Element', // Assuming the third quoted string is the Name
      })
    }
  }
  return unassignedDetails
}

function extractBuildingStoreys({ content }: { content: string }) {
  const storeyRegex = /IFCBUILDINGSTOREY\('([^']+)',#[^,]+,'([^']*)'/g
  const storeyDetails = [] as PartialResult[]
  let match

  while ((match = storeyRegex.exec(content)) !== null) {
    storeyDetails.push({
      globalId: match[1], // GlobalId is the first quoted value
      name: match[2], // Name is the third quoted value
    })
  }

  return storeyDetails
}

function extractProxies({ content }: { content: string }) {
  const proxyRegex = /IFCBUILDINGELEMENTPROXY\('([^']+)',#\d+,'([^']*)'/g
  const proxies = [] as PartialResult[]
  let match
  while ((match = proxyRegex.exec(content)) !== null) {
    proxies.push({
      globalId: match[1],
      name: match[2] || 'Unnamed Proxy', // Provide a default name if none is extracted
    })
  }
  return proxies
}

function extractSpaceNames({ content }: { content: string }) {
  const spaceRegex = /IFCSPACE\('([^']+)',#[^,]+,'([^']*)'/g
  const spaces = [] as PartialResult[]
  let match

  while ((match = spaceRegex.exec(content)) !== null) {
    spaces.push({
      globalId: match[1],
      name: match[2] || 'Unnamed Space', // Provide a fallback for unnamed spaces
    })
  }
  return spaces
}

function checkObjectRelations({
  content,
  objectRegex,
  relationRegex,
}: {
  content: string
  objectRegex: RegExp | string
  relationRegex: RegExp | string
}) {
  const objectMatches = content.match(objectRegex) || []
  return objectMatches.every((object) => {
    const match = object.match(/#(\d+)/)
    if (!match) return false // Return false if no ID match is found
    const objectId = match[1]
    const relationPattern = new RegExp(`#(${objectId}).*${relationRegex}`, 'gi')
    return relationPattern.test(content)
  })
}

function extractIFCAttribute({ content, position }: { content: string; position: number }) {
  // This function extracts an attribute based on its position in the list of quoted values.
  const regex = /'([^']*)'/g
  let currentMatch
  let index = 0

  while ((currentMatch = regex.exec(content)) !== null) {
    index += 1
    if (index === position) {
      return currentMatch[1] // Returns the matched group which is the content inside quotes
    }
  }
  return undefined // Returns undefined if the position is not found
}

interface ProcessContentChunkProps {
  content: string
  regex: RegExp
}

interface Rule {
  name: string
  regex: RegExp
  process: (props: ProcessContentChunkProps) => PartialResult[] | boolean | string | undefined
  check: (value: PartialResult[] | string[]) => { value: PartialResult[] | string[]; passed: boolean }
}

// Rule definitions
export const rules: Rule[] = [
  {
    name: 'Project Name',
    regex: /IFCPROJECT\('[^']+',#[^,]+,'([^']+)'/i,
    process: extractAttributeValue,
    check: (value) => ({ value, passed: !!value }), // Ensure value exists to pass
  },
  {
    name: 'Objects related to Project',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)/gi,
    process: ({ content, regex }) => checkObjectRelations({ content, objectRegex: regex, relationRegex: 'IFCPROJECT' }),
    // @ts-expect-error issues with boolean value
    check: (passed) => ({ value: passed, passed: passed }),
  },
  {
    name: 'Site Name',
    regex: /IFCSITE\('[^']+',#[^,]+,'([^']+)'/i,
    process: extractAttributeValue,
    check: (value) => ({ value, passed: !!value }), // Ensure value exists to pass
  },
  {
    name: 'Objects related to Site',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)/gi,
    process: ({ content, regex }) => checkObjectRelations({ content, objectRegex: regex, relationRegex: 'IFCSITE' }),
    // @ts-expect-error issues with boolean value
    check: (passed) => ({ value: passed, passed }),
  },
  {
    name: 'Building Name',
    regex: /IFCBUILDING\('[^']+',#[^,]+,'([^']+)'/i,
    process: extractAttributeValue,
    check: (value) => ({ value, passed: !!value }), // Ensure value exists to pass
  },
  {
    name: 'Objects related to Building',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)/gi,
    process: ({ content, regex }) =>
      checkObjectRelations({
        content,
        objectRegex: regex,
        relationRegex: 'IFCBUILDING',
      }),
    // @ts-expect-error issues with boolean value
    check: (passed) => ({ value: passed, passed }),
  },
  {
    name: 'Storey Names',
    regex: /IFCBUILDINGSTOREY\('[^']+',#[^,]+,'([^']+)'/gi,
    process: ({ content }) => extractBuildingStoreys({ content } as { content: string }),
    check: (value) => ({ value, passed: value.length > 0 }),
  },
  {
    name: 'Objects related to BuildingStory',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)\('([^']+)',#\d+,'([^']*)'/gi,
    process: countElementsWithoutStorey,
    check: (value) => ({
      value: value,
      passed: value.length === 0, // Check passes if no unassigned elements found
    }),
  },
  {
    name: 'Space Names',
    regex: /IFCSPACE\(/gi,
    process: ({ content }) => extractSpaceNames({ content } as { content: string }),
    check: (spaces) => ({ value: spaces, passed: spaces.length === 0 }), // Passes if no spaces found
  },
  {
    name: 'Proxy Count',
    regex: /IFCBUILDINGELEMENTPROXY\(/gi,
    process: ({ content }) => extractProxies({ content } as { content: string }),
    check: (proxies) => ({ value: proxies, passed: proxies.length === 0 }), // Update logic as needed
  },
]
