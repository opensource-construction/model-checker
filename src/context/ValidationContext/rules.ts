import { PartialResult } from './interfaces';

interface ProcessContentChunkProps {
  content: string;
  shapes?: Set<string>;
  geometricEntities?: PartialResult[];
  regex?: RegExp;
}

interface Rule {
  name: string;
  regex: RegExp;
  process: (props: ProcessContentChunkProps) => PartialResult[];
  check: (value: PartialResult[]) => { value: PartialResult[]; passed: boolean };
}

function identifyGeometricEntities({ content, shapes = new Set<string>(), geometricEntities = [] }: ProcessContentChunkProps): PartialResult[] {
  if (!content) {
    return geometricEntities;
  }

  const shapeRegex = /#(\d+)=IFCPRODUCTDEFINITIONSHAPE\([^;]*\);/gi;
  const referencingEntitiesRegex = /#(\d+)=IFC[^\(]*\('([^']+)',#\d+,([^,]*),([^,]*),'([^']*)',[^;]*#(\d+)[^;]*\);/gi;

  let match: RegExpExecArray | null;

  while ((match = shapeRegex.exec(content)) !== null) {
    shapes.add(match[1]);
  }

  while ((match = referencingEntitiesRegex.exec(content)) !== null) {
    if (shapes.has(match[6])) {
      geometricEntities.push({
        globalId: match[2] !== '$' ? match[2] : '', // Ensure correct attribute is used for globalId
        name: match[3] !== '$' ? match[3] : '', // Ensure correct attribute is used for name
        entityId: match[1],
        description: match[4] !== '$' ? match[4] : '', // Handle elements without descriptions
        shapeId: match[6],
        passed: false
      });
    }
  }

  return geometricEntities;
}


function checkStoreyRelation({ content, geometricEntities = [] }: ProcessContentChunkProps): PartialResult[] {
  if (!content) {
    return geometricEntities.map(entity => ({ ...entity, passed: false }));
  }

  const relContainedRegex = /#(\d+)=IFCRELCONTAINEDINSPATIALSTRUCTURE\([^,]*,[^,]*,.*?,(\(#[^)]*\)),#(\d+)\);/gi;
  const relatedEntities: { [key: string]: string } = {};

  let match: RegExpExecArray | null;

  while ((match = relContainedRegex.exec(content)) !== null) {
    const entityList = match[2];
    const storeyId = match[3];
    const entities = entityList.match(/#(\d+)/g);
    if (entities) {
      entities.forEach(entity => {
        relatedEntities[entity.replace('#', '')] = storeyId;
      });
    }
  }

  return geometricEntities.map(entity => ({
    ...entity,
    passed: relatedEntities.hasOwnProperty(entity.entityId),
    storeyId: relatedEntities[entity.entityId] || null
  }));
}

function identifyAndCheckGeometricEntities(props: ProcessContentChunkProps): PartialResult[] {
  const geometricEntities = identifyGeometricEntities(props);
  const checkedEntities = checkStoreyRelation({ ...props, geometricEntities });
  return checkedEntities;
}

function checkGeometricEntitiesHaveDescriptions(props: ProcessContentChunkProps): PartialResult[] {
  const geometricEntities = identifyGeometricEntities(props);
  return geometricEntities.map(entity => ({
    ...entity,
    passed: !!entity.description && entity.description.trim() !== '' // Check if the description exists and is not just spaces
  }));
}


function extractAttributes({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  if (!content || !regex) {
    return [];
  }

  const results: PartialResult[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const globalId = match[1];
    const name = match[2];
    results.push({
      globalId,
      name,
      entityId: globalId, // Assuming entityId is the same as globalId here
      passed: !!name,
    });
  }

  return results;
}

function extractBuildingStoreys({ content }: ProcessContentChunkProps): PartialResult[] {
  if (!content) {
    return [];
  }

  const storeyRegex = /IFCBUILDINGSTOREY\('([^']+)',#[^,]+,'([^']*)'/g;
  const storeyDetails: PartialResult[] = [];
  let match;

  while ((match = storeyRegex.exec(content)) !== null) {
    storeyDetails.push({
      globalId: match[1],
      name: match[2],
      entityId: match[1], // Assuming entityId is the same as globalId here
      passed: true,
    });
  }

  return storeyDetails;
}

function extractProxies({ content }: ProcessContentChunkProps): PartialResult[] {
  if (!content) {
    return [];
  }

  const proxyRegex = /IFCBUILDINGELEMENTPROXY\('([^']+)',#\d+,'([^']*)'/g;
  const proxies: PartialResult[] = [];
  let match;
  while ((match = proxyRegex.exec(content)) !== null) {
    proxies.push({
      globalId: match[1],
      name: match[2] || 'Unnamed Proxy',
      entityId: match[1], // Assuming entityId is the same as globalId here
      passed: false,
    });
  }
  return proxies;
}

function extractSpaceNames({ content }: ProcessContentChunkProps): PartialResult[] {
  if (!content) {
    return [];
  }

  const spaceRegex = /IFCSPACE\('([^']+)',#[^,]+,'([^']*)'/g;
  const spaces: PartialResult[] = [];
  let match;

  while ((match = spaceRegex.exec(content)) !== null) {
    spaces.push({
      globalId: match[1],
      name: match[2] || 'Unnamed Space',
      entityId: match[1], // Assuming entityId is the same as globalId here
      passed: false,
    });
  }
  return spaces;
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
    regex: /IFCRELCONTAINEDINSPATIALSTRUCTURE\([^,]*,#[^,]+,\(([^)]*)\)/gi,
    process: (props) => identifyAndCheckGeometricEntities(props),
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
    regex: /IFCRELCONTAINEDINSPATIALSTRUCTURE\([^,]*,#[^,]+,\(([^)]*)\)/gi,
    process: (props) => identifyAndCheckGeometricEntities(props),
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
    regex: /IFCRELCONTAINEDINSPATIALSTRUCTURE\([^,]*,#[^,]+,\(([^)]*)\)/gi,
    process: (props) => identifyAndCheckGeometricEntities(props),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects pass
  },
  {
    name: 'story-name',
    regex: /IFCBUILDINGSTOREY\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: extractBuildingStoreys,
    check: (value) => ({ value, passed: value.length > 0 }),
  },
  {
    name: 'story-relation',
    regex: /IFCRELCONTAINEDINSPATIALSTRUCTURE\([^,]*,#[^,]+,\(([^)]*)\)/gi,
    process: (props) => identifyAndCheckGeometricEntities(props),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects pass
  },
  {
    name: 'space-name',
    regex: /IFCSPACE\('([^']+)',#[^,]+,'([^']*)'/gi,
    process: extractSpaceNames,
    check: (spaces) => ({ value: spaces, passed: spaces.length === 0 }), // Passes if no spaces found
  },
  {
    name: 'entities-have-descriptions',  // New rule for checking if geometric entities have descriptions
    regex: /.*/,  // Apply this rule to all content
    process: checkGeometricEntitiesHaveDescriptions,
    check: (value) => ({ value, passed: value.every(attr => attr.passed) }), // Ensure all geometric entities have descriptions
  },
  {
    name: 'object-count',
    regex: /IFCBUILDINGELEMENTPROXY\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: extractProxies,
    check: (proxies) => ({ value: proxies, passed: proxies.length === 0 }),
  },
  {
    name: 'list-geometry-elements',
    regex: /IFC[^\(]+/gi,
    process: identifyGeometricEntities, // Process without regex
    check: (value) => ({ value, passed: true }), // Always pass, this is for listing purposes
  },
];
