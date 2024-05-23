import { PartialResult } from './interfaces.ts';

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

function extractProxies({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const results: PartialResult[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const type = match[1];
    const globalId = match[2];
    const name = match[3] || `Unnamed ${type}`;

    results.push({
      globalId,
      name,
      passed: type !== 'BUILDINGELEMENTPROXY', // Proxies fail, others pass
    });
  }

  for (const match of content.matchAll(regex)) {
    const globalId = match[2];
    const name = match[3] || `Unnamed ${match[1]}`;
    if (!results.some(result => result.globalId === globalId)) {
      results.push({
        globalId,
        name,
        passed: match[1] !== 'BUILDINGELEMENTPROXY', // Proxies fail, others pass
      });
    }
  }

  return results;
}


function extractSpaceNames({ content }: { content: string }): PartialResult[] {
  const spaceRegex = /IFCSPACE\('([^']+)',#[^,]+,'([^']*)'/g;
  const spaces: PartialResult[] = [];
  let match;

  while ((match = spaceRegex.exec(content)) !== null) {
    const globalId = match[1];
    const name = match[2];
    const passed = !!name && name.trim() !== ''; // Ensure name exists and is not empty
    spaces.push({
      globalId,
      name,
      passed,
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

function checkDescriptions({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const elementRegex = /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#\d+,'(?<name>[^']+)','(?<description>[^']*)','[^']*'/g;
  const results: PartialResult[] = [];
  let match: RegExpExecArray | null;

  while ((match = elementRegex.exec(content)) !== null) {
    const { globalId, name, description } = match.groups!;
    const passed = description !== '$' && description.trim() !== ''; // Ensure description is valid and not a dollar sign or empty
    results.push({
      globalId,
      name,
      passed,
    });
  }

  // Ensure all elements are checked even if no description is found
  for (const match of content.matchAll(regex)) {
    const { globalId, name } = match.groups!;
    if (!results.some(result => result.globalId === globalId)) {
      results.push({
        globalId,
        name,
        passed: false,
      });
    }
  }

  return results;
}


function checkTypeNames({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const elementRegex = /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#\d+,'(?<name>[^']+)','[^']*','(?<type>[^']*)'/g;
  const results: PartialResult[] = [];
  let match: RegExpExecArray | null;

  while ((match = elementRegex.exec(content)) !== null) {
    const { globalId, name, type } = match.groups!;
    const passed = type !== '$' && type.trim() !== ''; // Ensure type name is valid and not a dollar sign or empty
    results.push({
      globalId,
      name,
      passed,
    });
  }

  // Ensure all elements are checked even if no type name is found
  for (const match of content.matchAll(regex)) {
    const { globalId, name, type } = match.groups!;
    if (!results.some(result => result.globalId === globalId)) {
      results.push({
        globalId,
        name,
        passed: type !== '$' && type.trim() !== '', // Ensure type name is valid and not a dollar sign or empty
      });
    }
  }

  return results;
}



function checkMaterialNames({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const results: PartialResult[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    const globalId = match[2];
    const name = match[3];
    const materialName = match[3];
    const passed = !!materialName && materialName.trim() !== ''; // Ensure material name exists and is not empty
    results.push({
      globalId,
      name,
      passed,
    });
  }

  return results;
}

function checkPredefinedTypes({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const results: PartialResult[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const { globalId, name, predefinedType } = match.groups!;
    const passed = predefinedType !== undefined && predefinedType.trim() !== ''; // Ensure predefined type is filled out
    results.push({
      globalId,
      name,
      passed,
    });
  }

  // Ensure all elements are checked even if no predefined type is found
  for (const match of content.matchAll(regex)) {
    const { globalId, name, predefinedType } = match.groups!;
    if (!results.some(result => result.globalId === globalId)) {
      results.push({
        globalId,
        name,
        passed: predefinedType !== undefined && predefinedType.trim() !== '', // Ensure predefined type is filled out
      });
    }
  }

  return results;
}

function checkElementNames({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const elementRegex = /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY|SYSTEMFURNITUREELEMENT)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)'/g;
  const results: PartialResult[] = [];
  let match: RegExpExecArray | null;

  while ((match = elementRegex.exec(content)) !== null) {
    const { globalId, name } = match.groups!;
    const passed = name !== '$' && name.trim() !== ''; // Ensure name is not '$' and not empty
    results.push({
      globalId,
      name,
      passed,
    });
  }

  // Ensure all elements are checked even if no name is found
  for (const match of content.matchAll(regex)) {
    const { globalId, name } = match.groups!;
    if (!results.some(result => result.globalId === globalId)) {
      results.push({
        globalId,
        name,
        passed: name !== '$' && name.trim() !== '', // Ensure name is not '$' and not empty
      });
    }
  }

  return results;
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
    regex: /IFCBUILDINGSTOREY\('([^']+)',#[^,]+,'([^']*)'/gi,
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
    regex: /IFCSPACE\('([^']+)',#[^,]+,'([^']*)'/gi,
    process: ({ content }) => extractSpaceNames({ content }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all spaces have names
  },
  {
    name: 'object-name',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY|SYSTEMFURNITUREELEMENT)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)'/gi,
    process: ({ content, regex }) => checkElementNames({ content, regex }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all elements have valid names
  },  
  {
    name: 'object-description',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)',[^,]*,'([^']*)'/gi,
    process: ({ content, regex }) => checkDescriptions({ content, regex }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects have valid descriptions
  },    
  {
    name: 'type-name',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)',[^,]*,'(?<type>[^']*)'/gi,
    process: ({ content, regex }) => checkTypeNames({ content, regex }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects have valid type names
  },
  {
    name: 'material-name',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY)\('([^']+)',#[^,]+,'([^']*)',[^,]*,'([^']*)'/gi,
    process: ({ content, regex }) => checkMaterialNames({ content, regex }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects have material names
  },
  {
    name: 'predefined-type',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY|SYSTEMFURNITUREELEMENT)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)',[^,]*,'[^']*',[^,]*,[^,]*,[^,]*\.(?<predefinedType>[A-Z_]+)\./gi,
    process: ({ content, regex }) => checkPredefinedTypes({ content, regex }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if predefined types are filled out
  },  
  {
    name: 'object-count',
    regex: /IFC(WALLSTANDARDCASE|DOOR|WINDOW|SLAB|COLUMN|BEAM|BUILDINGELEMENTPROXY|JUNCTIONBOX|DUCTSEGMENT|SYSTEMFURNITUREELEMENT)\('([^']+)',#[^,]+,'([^']*)'/gi,
    process: ({ content, regex }) => extractProxies({ content, regex }),
    check: (value) => ({ value, passed: value.every(element => element.passed) }), // Pass if all objects pass
  },
];
