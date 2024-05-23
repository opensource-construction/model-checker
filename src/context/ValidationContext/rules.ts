import { PartialResult } from './interfaces.ts';

function extractAttributes({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const results: PartialResult[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const globalId = match[1];
    const name = match[2];
    results.push({
      globalId,
      name,
      passed: !!name,
    });
  }

  return results;
}

function extractBuildingStoreys({ content }: { content: string }): PartialResult[] {
  const storeyRegex = /IFCBUILDINGSTOREY\('([^']+)',#[^,]+,'([^']*)'/g;
  const storeyDetails: PartialResult[] = [];
  let match;

  while ((match = storeyRegex.exec(content)) !== null) {
    storeyDetails.push({
      globalId: match[1],
      name: match[2],
      passed: true,
    });
  }

  return storeyDetails;
}

function extractProxies({ content }: { content: string }): PartialResult[] {
  const proxyRegex = /IFCBUILDINGELEMENTPROXY\('([^']+)',#\d+,'([^']*)'/g;
  const proxies: PartialResult[] = [];
  let match;
  while ((match = proxyRegex.exec(content)) !== null) {
    proxies.push({
      globalId: match[1],
      name: match[2] || 'Unnamed Proxy',
      passed: false,
    });
  }
  return proxies;
}

function extractSpaceNames({ content }: { content: string }): PartialResult[] {
  const spaceRegex = /IFCSPACE\('([^']+)',#[^,]+,'([^']*)'/g;
  const spaces: PartialResult[] = [];
  let match;

  while ((match = spaceRegex.exec(content)) !== null) {
    spaces.push({
      globalId: match[1],
      name: match[2] || 'Unnamed Space',
      passed: false,
    });
  }
  return spaces;
}

function checkObjectRelations({
  content,
  objectRegex,
  relationRegex,
}: {
  content: string;
  objectRegex: RegExp | string;
  relationRegex: RegExp | string;
}): PartialResult[] {
  const results: PartialResult[] = [];
  const objectMatches = content.match(objectRegex);

  if (objectMatches) {
    objectMatches.forEach((object) => {
      const match = object.match(/'([^']+)',#(\d+),'([^']*)'/);
      if (match) {
        const objectId = match[1];
        const name = match[3];
        const relationPattern = new RegExp(`#(${objectId}).*${relationRegex}`, 'gi');
        const passed = relationPattern.test(content);

        results.push({ globalId: objectId, name, passed });
      }
    });
  }
  return results;
}

interface ProcessContentChunkProps {
  content: string;
  regex: RegExp;
}

interface Rule {
  name: string;
  regex: RegExp;
  process: (props: ProcessContentChunkProps) => PartialResult[];
  check: (value: PartialResult[]) => { value: PartialResult[]; passed: boolean };
}

// Rule definitions
export const rules: Rule[] = [
  {
    name: 'project-name',
    regex: /IFCPROJECT\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: extractAttributes,
    check: (value) => ({ value, passed: value.length > 0 }), // Ensure value exists to pass
  },
  {
    name: 'project-relation',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: ({ content, regex }) => checkObjectRelations({ content, objectRegex: regex, relationRegex: 'IFCPROJECT' }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects pass
  },
  {
    name: 'site-name',
    regex: /IFCSITE\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: extractAttributes,
    check: (value) => ({ value, passed: value.length > 0 }), // Ensure value exists to pass
  },
  {
    name: 'site-relation',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: ({ content, regex }) => checkObjectRelations({ content, objectRegex: regex, relationRegex: 'IFCSITE' }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects pass
  },
  {
    name: 'building-name',
    regex: /IFCBUILDING\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: extractAttributes,
    check: (value) => ({ value, passed: value.length > 0 }), // Ensure value exists to pass
  },
  {
    name: 'building-relation',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: ({ content, regex }) => checkObjectRelations({ content, objectRegex: regex, relationRegex: 'IFCBUILDING' }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects pass
  },
  {
    name: 'story-name',
    regex: /IFCBUILDINGSTOREY\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: ({ content }) => extractBuildingStoreys({ content }),
    check: (value) => ({ value, passed: value.length > 0 }),
  },
  {
    name: 'story-relation',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: ({ content, regex }) => checkObjectRelations({ content, objectRegex: regex, relationRegex: 'IFCBUILDING' }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects pass
  },
  {
    name: 'space-name',
    regex: /IFCSPACE\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: ({ content }) => extractSpaceNames({ content }),
    check: (spaces) => ({ value: spaces, passed: spaces.length === 0 }), // Passes if no spaces found
  },
  {
    name: 'object-count',
    regex: /IFCBUILDINGELEMENTPROXY\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: ({ content }) => extractProxies({ content }),
    check: (proxies) => ({ value: proxies, passed: proxies.length === 0 }),
  },
];
