import { PartialResult } from './interfaces.ts'

interface ProcessContentChunkProps {
  content: string;
  regex: RegExp;
  storeyData?: { [key: string]: string };
  typeRelations?: { [key: string]: string };
  relatedTypeNames?: { [key: string]: string };
}

interface Rule {
  name: string
  regex: RegExp
  process: (props: ProcessContentChunkProps) => PartialResult[]
  check: (value: PartialResult[]) => { value: PartialResult[]; passed: boolean | null }
}

function extractAttributes({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const results: PartialResult[] = []
  let match

  while ((match = regex.exec(content)) !== null) {
    const globalId = match[1]
    const name = match[2]
    results.push({
      globalId,
      name,
      passed: !!name,
    })
  }

  return results
}

function extractBuildingStoreys({ content }: { content: string }): PartialResult[] {
  const storeyRegex = /IFCBUILDINGSTOREY\('([^']+)',#[^,]+,'([^']*)'/g
  const storeyDetails: PartialResult[] = []
  let match

  while ((match = storeyRegex.exec(content)) !== null) {
    storeyDetails.push({
      globalId: match[1],
      name: match[2],
      passed: true,
    })
  }

  return storeyDetails
}

function extractProxies({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const results: PartialResult[] = []
  let match

  while ((match = regex.exec(content)) !== null) {
    const type = match[1]
    const globalId = match[2]

    results.push({
      globalId,
      name: `${type}`, // Append type to name
      passed: type === 'BUILDINGELEMENTPROXY', // Proxies pass, others fail
    })
  }

  for (const match of content.matchAll(regex)) {
    const globalId = match[2]
    if (!results.some((result) => result.globalId === globalId)) {
      results.push({
        globalId,
        name: `${match[1]}`, // Append type to name
        passed: match[1] === 'BUILDINGELEMENTPROXY', // Proxies pass, others fail
      })
    }
  }

  return results
}

function extractSpaceNames({ content }: { content: string }): PartialResult[] {
  const spaceRegex = /IFCSPACE\('([^']+)',#[^,]+,'([^']*)'/g
  const spaces: PartialResult[] = []
  let match

  while ((match = spaceRegex.exec(content)) !== null) {
    const globalId = match[1]
    const name = match[2]
    const passed = !!name && name.trim() !== '' // Ensure name exists and is not empty
    spaces.push({
      globalId,
      name,
      passed,
    })
  }
  return spaces
}

function checkStoreyRelation({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const results: PartialResult[] = []
  const relContainedRegex = /#(\d+)=IFCRELCONTAINEDINSPATIALSTRUCTURE\([^,]*,[^,]*,.*?,(\(#[^)]*\)),#(\d+)\);/gi
  const storeyRegex = /#(\d+)=IFCBUILDINGSTOREY\('([^']+)',#[^,]+,'([^']*)'/g
  const buildingStoreyMap: { [key: string]: string } = {}
  const elementToStoreyMap: { [key: string]: string } = {}

  let match: RegExpExecArray | null

  // Extract storey IDs and names
  while ((match = storeyRegex.exec(content)) !== null) {
    const storeyId = match[1]
    const storeyName = match[3]
    buildingStoreyMap[storeyId] = storeyName
  }

  // Map elements to storeys
  while ((match = relContainedRegex.exec(content)) !== null) {
    const entityList = match[2]
    const storeyId = match[3]
    const entities = entityList.match(/#(\d+)/g)
    if (entities) {
      entities.forEach((entity) => {
        elementToStoreyMap[entity.replace('#', '')] = storeyId
      })
    }
  }

  // Check relation and map to storey names
  while ((match = regex.exec(content)) !== null) {
    const { entityId, globalId } = match.groups!
    const storeyId = elementToStoreyMap[entityId]
    const storeyName = storeyId ? buildingStoreyMap[storeyId] : 'Unknown'
    const passed = storeyId !== undefined
    results.push({
      globalId,
      name: storeyName, // Use storey name instead of element name
      passed,
    })
  }

  return results
}

function checkDescriptions({
  content,
  regex,
  allElements,
}: {
  content: string
  regex: RegExp
  allElements: PartialResult[]
}): PartialResult[] {
  const results: PartialResult[] = []
  let match: RegExpExecArray | null

  const descriptionMap: { [key: string]: PartialResult } = {}

  while ((match = regex.exec(content)) !== null) {
    const { globalId, description } = match.groups!
    const passed = description !== '$' && description.trim() !== '' // Ensure description is valid
    descriptionMap[globalId] = {
      globalId,
      name: `${description}`, // Append description to name
      passed,
    }
  }

  for (const element of allElements) {
    if (element.globalId && descriptionMap[element.globalId]) {
      results.push(descriptionMap[element.globalId])
    } else {
      results.push({
        globalId: element.globalId || '', // Fallback to empty string if globalId is not found
        name: '', // Set name to empty string
        passed: false,
      })
    }
  }

  return results
}

function extractDirectTypeNames({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const results: PartialResult[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const globalId = match.groups!.globalId;
    const name = match.groups!.name || 'Unnamed';
    results.push({
      globalId,
      name,
      passed: !!name,
    });
  }

  return results;
}

function extractRelatedTypeNames({
  content,
  relatedTypeNames = {},
  typeRelations = {},
}: ProcessContentChunkProps): PartialResult[] {
  const relDefinesByTypeRegex = /#(?<relId>\d+)=IFCRELDEFINESBYTYPE\('[^']*',#\d+,\$,\$,\((?<relatedEntities>#\d+(?:,#\d+)*)\),#(?<relatedType>\d+)\);/gi;
  const typeRegex = /#(?<typeId>\d+)=IFC[A-Z0-9]+\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)'/gi;
  let match: RegExpExecArray | null;

  // First, populate typeRelations with actual type names
  while ((match = typeRegex.exec(content)) !== null) {
    const typeId = match.groups!.typeId;
    const typeName = match.groups!.name;
    typeRelations[typeId] = typeName;
  }

  // Then process relationships to gather related type names
  while ((match = relDefinesByTypeRegex.exec(content)) !== null) {
    const relatedEntities = match.groups!.relatedEntities?.match(/#(\d+)/g) || [];
    const relatedTypeId = match.groups!.relatedType;

    relatedEntities.forEach((entity) => {
      const entityId = entity.replace('#', '');
      relatedTypeNames[entityId] = typeRelations[relatedTypeId] || 'Unknown';
    });
  }

  return Object.keys(relatedTypeNames).map((entityId) => ({
    globalId: entityId,
    name: relatedTypeNames[entityId] || '',
    passed: true,
  }));
}

function combineTypeNames({
  content,
  regex,
}: ProcessContentChunkProps): PartialResult[] {
  const directTypeResults = extractDirectTypeNames({ content, regex });
  const relatedTypeResults = extractRelatedTypeNames({ content, regex });

  // Combine results, avoiding duplicates
  const combinedResults: { [key: string]: PartialResult } = {};
  [...directTypeResults, ...relatedTypeResults].forEach((result) => {
    const globalId = result.globalId || ''; // Ensure globalId is not undefined
    if (!combinedResults[globalId]) {
      combinedResults[globalId] = result;
    } else {
      // Prefer related type name if available
      combinedResults[globalId].name = combinedResults[globalId].name || result.name;
    }
  });

  return Object.values(combinedResults);
}


function getElementsWithMaterialAssociations(content: string): {
  [key: string]: { materialId: string; materialName: string }
} {
  const relAssociatesMaterialRegex = /#(\d+)=IFCRELASSOCIATESMATERIAL\([^,]*,[^,]*,.*?,\(([^)]*)\),#(\d+)\);/g
  const elementRegex = /#(\d+)/g
  const materialNameRegex = /#(\d+)=IFCMATERIAL\('([^']*)'/g
  const elementToMaterial: { [key: string]: { materialId: string; materialName: string } } = {}

  let match: RegExpExecArray | null
  const materialNames: { [key: string]: string } = {}

  while ((match = materialNameRegex.exec(content)) !== null) {
    const materialId = match[1]
    const materialName = match[2]
    materialNames[materialId] = materialName
  }

  while ((match = relAssociatesMaterialRegex.exec(content)) !== null) {
    const materialId = match[3]
    const elements = match[2].match(elementRegex) || []

    for (const element of elements) {
      const elementId = element.replace('#', '')
      elementToMaterial[elementId] = { materialId, materialName: materialNames[materialId] }
    }
  }

  return elementToMaterial
}

function checkMaterialAssignments(content: string): PartialResult[] {
  const elementToMaterial = getElementsWithMaterialAssociations(content)
  const allElements = getAllRelevantElements(content)

  for (const elementId in allElements) {
    if (Object.hasOwn(elementToMaterial, elementId)) {
      allElements[elementId].passed = true
      allElements[elementId].name = elementToMaterial[elementId].materialName
    } else {
      allElements[elementId].name = allElements[elementId].name || ''
    }
  }

  return Object.values(allElements)
}

function getAllRelevantElements(content: string): { [key: string]: PartialResult } {
  const elementRegex =
    /#(\d+)=IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)'/g
  const results: { [key: string]: PartialResult } = {}
  let match: RegExpExecArray | null

  while ((match = elementRegex.exec(content)) !== null) {
    const elementId = match[1]
    const globalId = match.groups!.globalId
    results[elementId] = {
      globalId: globalId,
      name: ``,
      passed: false, // Initialize as false, will be updated later
    }
  }

  return results
}

function checkPredefinedTypes({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const results: PartialResult[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    const { globalId, predefinedType } = match.groups!
    const passed = predefinedType !== 'NOTDEFINED' && predefinedType !== 'USERDEFINED' // Only fail if predefined type is NOTDEFINED or USERDEFINED
    results.push({
      globalId,
      name: `${predefinedType}`,
      passed,
    })
  }

  // Ensure all elements with predefined types are checked even if no predefined type is found initially
  for (const match of content.matchAll(regex)) {
    const { globalId, predefinedType } = match.groups!
    if (!results.some((result) => result.globalId === globalId)) {
      results.push({
        globalId,
        name: `${predefinedType}`,
        passed: predefinedType !== 'NOTDEFINED' && predefinedType !== 'USERDEFINED', // Only fail if predefined type is NOTDEFINED or USERDEFINED
      })
    }
  }

  return results
}

function checkElementNames({ content, regex }: ProcessContentChunkProps): PartialResult[] {
  const elementRegex =
    /IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)'/g
  const results: PartialResult[] = []
  let match: RegExpExecArray | null

  while ((match = elementRegex.exec(content)) !== null) {
    const { globalId, name } = match.groups!
    const validName = name.trim() !== ''
    const passed = validName && name !== '$' // Ensure name is valid
    results.push({
      globalId,
      name: validName ? name : `Unnamed`,
      passed,
    })
  }

  // Ensure all elements are checked even if no name is found
  for (const match of content.matchAll(regex)) {
    const { globalId, name } = match.groups!
    const validName = name.trim() !== ''
    if (!results.some((result) => result.globalId === globalId)) {
      results.push({
        globalId,
        name: validName ? name : `Unnamed`,
        passed: validName && name !== '$' && name.trim() !== '', // Ensure name is valid
      })
    }
  }

  return results
}

function extractProjects(content: string): { [key: string]: string } {
  const projectRegex = /#(\d+)=IFCPROJECT\('([^']+)',#[^,]+,'([^']*)'/g
  const projectMap: { [key: string]: string } = {}
  let match: RegExpExecArray | null

  while ((match = projectRegex.exec(content)) !== null) {
    const projectId = match[1]
    const projectName = match[3]
    projectMap[projectId] = projectName
  }

  return projectMap
}

function extractSites(content: string): { [key: string]: string } {
  const siteRegex = /#(\d+)=IFCSITE\('([^']+)',#[^,]+,'([^']+)'/g
  const siteMap: { [key: string]: string } = {}
  let match: RegExpExecArray | null

  while ((match = siteRegex.exec(content)) !== null) {
    const siteId = match[1]
    const siteName = match[3]
    siteMap[siteId] = siteName
  }

  return siteMap
}

function extractBuildings(content: string): { [key: string]: string } {
  const buildingRegex = /#(\d+)=IFCBUILDING\('([^']+)',#[^,]+,'([^']+)'/g
  const buildingMap: { [key: string]: string } = {}
  let match: RegExpExecArray | null

  while ((match = buildingRegex.exec(content)) !== null) {
    const buildingId = match[1]
    const buildingName = match[3]
    buildingMap[buildingId] = buildingName
  }

  return buildingMap
}

function mapStoreysToBuildings(content: string): { [key: string]: string } {
  const storeyRegex = /#(\d+)=IFCBUILDINGSTOREY\('([^']+)',#[^,]+,'([^']*)'/g
  const relAggregatesRegex = /#(\d+)=IFCRELAGGREGATES\([^,]*,[^,]*,.*?,#(\d+),\(([^)]*)\)\);/g
  const storeyToBuildingMap: { [key: string]: string } = {}
  let match: RegExpExecArray | null

  // Map storeys to buildings directly
  while ((match = storeyRegex.exec(content)) !== null) {
    const storeyId = match[1]
    const buildingId = match[2]
    storeyToBuildingMap[storeyId] = buildingId
  }

  // Update with aggregate relationships if needed
  while ((match = relAggregatesRegex.exec(content)) !== null) {
    const parentId = match[2]
    const childList = match[3]
    const children = childList.match(/#(\d+)/g)
    if (children) {
      children.forEach((child) => {
        const childId = child.replace('#', '')
        if (storeyToBuildingMap[childId]) {
          storeyToBuildingMap[childId] = parentId
        }
      })
    }
  }

  return storeyToBuildingMap
}

function mapBuildingsToSites(content: string): { [key: string]: string } {
  const relAggregatesRegex = /#(\d+)=IFCRELAGGREGATES\([^,]*,[^,]*,.*?,#(\d+),\(([^)]*)\)\);/g
  const buildingToSiteMap: { [key: string]: string } = {}
  let match: RegExpExecArray | null

  while ((match = relAggregatesRegex.exec(content)) !== null) {
    const parentId = match[2]
    const childList = match[3]
    const children = childList.match(/#(\d+)/g)
    if (children) {
      children.forEach((child) => {
        const childId = child.replace('#', '')
        if (!buildingToSiteMap[childId]) {
          buildingToSiteMap[childId] = parentId
        }
      })
    }
  }

  return buildingToSiteMap
}

function mapSitesToProjects(content: string): { [key: string]: string } {
  const relAggregatesRegex = /#(\d+)=IFCRELAGGREGATES\([^,]*,[^,]*,.*?,#(\d+),\(([^)]*)\)\);/g
  const siteToProjectMap: { [key: string]: string } = {}
  let match: RegExpExecArray | null

  while ((match = relAggregatesRegex.exec(content)) !== null) {
    const parentId = match[2]
    const childList = match[3]
    const children = childList.match(/#(\d+)/g)
    if (children) {
      children.forEach((child) => {
        const childId = child.replace('#', '')
        if (!siteToProjectMap[childId]) {
          siteToProjectMap[childId] = parentId
        }
      })
    }
  }

  return siteToProjectMap
}

function checkProjectRelation({ content }: ProcessContentChunkProps): PartialResult[] {
  const firstProjectId = getFirstProject(content)
  const firstProjectName = firstProjectId ? extractProjects(content)[firstProjectId] : 'Unknown Project'

  const projectMap = extractProjects(content)
  const siteToProjectMap = mapSitesToProjects(content)
  const buildingToSiteMap = mapBuildingsToSites(content)
  const storeyToBuildingMap = mapStoreysToBuildings(content)
  const elementToStoreyMap = mapElementsToStoreys(content)
  const elementToRoomMap = mapElementsToRooms(content)
  const roomToBuildingMap = mapRoomsToBuildings(content)

  const results: PartialResult[] = []
  const entityPattern =
    /#(?<entityId>\d+)=IFC(?:AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE)\('(?<globalId>[^']+)',#[^,]+,'[^']*'/gi

  let match: RegExpExecArray | null
  while ((match = entityPattern.exec(content)) !== null) {
    const { entityId, globalId } = match.groups!
    const storeyId = elementToStoreyMap[entityId]
    const roomId = elementToRoomMap[entityId]
    const buildingId = storeyId ? storeyToBuildingMap[storeyId] : roomId ? roomToBuildingMap[roomId] : undefined
    const siteId = buildingId ? buildingToSiteMap[buildingId] : undefined
    const projectId = siteId ? siteToProjectMap[siteId] : undefined

    // Use default project if none found
    const projectName = projectId ? projectMap[projectId] : firstProjectName
    const passed = Boolean(projectId) || Boolean(roomId)

    results.push({
      globalId,
      name: projectName,
      passed: Boolean(passed), // Ensure passed is a boolean
    })
  }

  return results
}

function checkSiteRelation({ content }: ProcessContentChunkProps): PartialResult[] {
  const firstSiteId = getFirstSite(content)
  const firstSiteName = firstSiteId ? extractSites(content)[firstSiteId] : 'Unknown Site'

  const siteMap = extractSites(content)
  const buildingToSiteMap = mapBuildingsToSites(content)
  const storeyToBuildingMap = mapStoreysToBuildings(content)
  const elementToStoreyMap = mapElementsToStoreys(content)
  const elementToRoomMap = mapElementsToRooms(content)
  const roomToBuildingMap = mapRoomsToBuildings(content)

  const results: PartialResult[] = []
  const entityPattern =
    /#(?<entityId>\d+)=IFC(?:AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE)\('(?<globalId>[^']+)',#[^,]+,'[^']*'/g

  let match: RegExpExecArray | null
  while ((match = entityPattern.exec(content)) !== null) {
    const { entityId, globalId } = match.groups!
    const storeyId = elementToStoreyMap[entityId]
    const roomId = elementToRoomMap[entityId]
    const buildingId = storeyId ? storeyToBuildingMap[storeyId] : roomId ? roomToBuildingMap[roomId] : undefined
    const siteId = buildingId ? buildingToSiteMap[buildingId] : firstSiteId

    // Use default site if none found
    const siteName = siteId ? siteMap[siteId] : firstSiteName
    const passed = Boolean(siteId) || Boolean(roomId)

    results.push({
      globalId,
      name: siteName,
      passed: Boolean(passed), // Ensure passed is a boolean
    })
  }

  return results
}

function checkBuildingRelation({ content }: ProcessContentChunkProps): PartialResult[] {
  const firstBuildingId = getFirstBuilding(content)
  const firstBuildingName = firstBuildingId ? extractBuildings(content)[firstBuildingId] : 'Unknown Building'

  const buildingMap = extractBuildings(content)
  const storeyToBuildingMap = mapStoreysToBuildings(content)
  const elementToStoreyMap = mapElementsToStoreys(content)
  const elementToRoomMap = mapElementsToRooms(content)
  const roomToBuildingMap = mapRoomsToBuildings(content)

  const results: PartialResult[] = []
  const entityPattern = new RegExp(
    /#(?<entityId>\d+)=IFC(?:AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE)\('(?<globalId>[^']+)',#[^,]+,'[^']*'/g,
  )

  let match: RegExpExecArray | null
  while ((match = entityPattern.exec(content)) !== null) {
    const { entityId, globalId } = match.groups!
    const storeyId = elementToStoreyMap[entityId]
    const roomId = elementToRoomMap[entityId]
    const buildingId = storeyId ? storeyToBuildingMap[storeyId] : roomId ? roomToBuildingMap[roomId] : firstBuildingId

    // Use default building if none found
    const buildingName = buildingId ? buildingMap[buildingId] : firstBuildingName
    const passed = Boolean(buildingId) || Boolean(roomId)

    results.push({
      globalId,
      name: buildingName,
      passed: Boolean(passed), // Ensure passed is a boolean
    })
  }

  return results
}

function mapElementsToStoreys(content: string): { [key: string]: string } {
  const relContainedRegex = /#(\d+)=IFCRELCONTAINEDINSPATIALSTRUCTURE\([^,]*,[^,]*,.*?,\((#[^)]*)\),#(\d+)\);/gi
  const elementToStoreyMap: { [key: string]: string } = {}
  let match: RegExpExecArray | null

  while ((match = relContainedRegex.exec(content)) !== null) {
    const entityList = match[2]
    const storeyId = match[3]
    const entities = entityList.match(/#(\d+)/g)
    if (entities) {
      entities.forEach((entity) => {
        const entityId = entity.replace('#', '')
        elementToStoreyMap[entityId] = storeyId
      })
    }
  }

  return elementToStoreyMap
}

function mapElementsToRooms(content: string): { [key: string]: string } {
  const elementToRoomMap: { [key: string]: string } = {}
  const relContainedRegex = /#(\d+)=IFCRELCONTAINEDINSPATIALSTRUCTURE\([^,]*,[^,]*,.*?,\((#[^)]*)\),#(\d+)\);/gi

  let match: RegExpExecArray | null
  while ((match = relContainedRegex.exec(content)) !== null) {
    const roomId = match[3]
    const entities = match[2].match(/#(\d+)/g) || []

    entities.forEach((entity) => {
      const entityId = entity.replace('#', '')
      elementToRoomMap[entityId] = roomId
    })
  }

  return elementToRoomMap
}

function mapRoomsToBuildings(content: string): { [key: string]: string } {
  const relContainedRegex = /#(\d+)=IFCRELCONTAINEDINSPATIALSTRUCTURE\([^,]*,[^,]*,.*?,(\(#[^)]*\)),#(\d+)\);/gi
  const roomToBuildingMap: { [key: string]: string } = {}
  let match: RegExpExecArray | null

  while ((match = relContainedRegex.exec(content)) !== null) {
    const entityList = match[2]
    const buildingId = match[3]
    const entities = entityList.match(/#(\d+)/g)
    if (entities) {
      entities.forEach((entity) => {
        const roomId = entity.replace('#', '')
        roomToBuildingMap[roomId] = buildingId
      })
    }
  }

  return roomToBuildingMap
}

function getFirstProject(content: string): string {
  const match = /#(\d+)=IFCPROJECT\('([^']+)',#[^,]+,'([^']*)'/g.exec(content)
  return match ? match[1] : ''
}

function getFirstSite(content: string): string {
  const match = /#(\d+)=IFCSITE\('([^']+)',#[^,]+,'([^']+)'/g.exec(content)
  return match ? match[1] : ''
}

function getFirstBuilding(content: string): string {
  const match = /#(\d+)=IFCBUILDING\('([^']+)',#[^,]+,'([^']+)'/g.exec(content)
  return match ? match[1] : ''
}

// Rule definitions
// Rules are intended to work only on valid IFC, non valid file structure and non-adherence to schema will cause certain rules to not function as intended
export const rules: Rule[] = [
  {
    name: 'project-name',
    regex: /IFCPROJECT\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: extractAttributes,
    check: (value) => ({ value, passed: value.length > 0 }),
  },
  {
    name: 'project-relation',
    regex:
      /IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: checkProjectRelation,
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects pass
  },
  {
    name: 'site-name',
    regex: /IFCSITE\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: extractAttributes,
    check: (value) => ({ value, passed: value.length > 0 }),
  },
  {
    name: 'site-relation',
    regex:
      /IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: checkSiteRelation,
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects pass
  },
  {
    name: 'building-name',
    regex: /IFCBUILDING\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: extractAttributes,
    check: (value) => ({ value, passed: value.length > 0 }),
  },
  {
    name: 'building-relation',
    regex:
      /IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('([^']+)',#[^,]+,'([^']+)'/gi,
    process: checkBuildingRelation,
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
    regex:
      /#(?<entityId>\d+)=IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)'/gi,
    process: ({ content, regex }) => checkStoreyRelation({ content, regex }),
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
    regex:
      /IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)'/gi,
    process: ({ content, regex }) => checkElementNames({ content, regex }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all elements have valid names
  },
  {
    name: 'object-description',
    regex:
      /IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)','(?<description>[^']*)'/gi,
    process: ({ content, regex }) => {
      const allElements = checkElementNames({
        content,
        regex:
          /IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)'/gi,
      })
      return checkDescriptions({ content, regex, allElements })
    },
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects have valid descriptions
  },
  {
    name: 'type-name',
    regex:
      /IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)',[^,]*,'(?<type>[^']*)'/gi,
    process: ({ content, regex }) => combineTypeNames({ content, regex }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all elements have valid type names
  },
  {
    name: 'material-name',
    regex:
      /IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)'/gi,
    process: ({ content }) => checkMaterialAssignments(content),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if all objects have material names
  },
  {
    name: 'predefined-type',
    regex:
      /#(?<entityId>\d+)=IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)',[^)]*?\.(?<predefinedType>[A-Z_]+)\.\);/gi,
    process: ({ content, regex }) => checkPredefinedTypes({ content, regex }),
    check: (value) => ({ value, passed: value.every((result) => result.passed) }), // Pass if predefined types are not UNDEFINED
  },
  {
    name: 'object-count',
    regex:
      /IFC(AIRTERMINAL|ALARM|BEAM|CABLECARRIERFITTING|CABLECARRIERSEGMENT|COLUMN|COVERING|CURTAINWALL|DAMPER|DOOR|DUCTFITTING|DUCTSEGMENT|DUCTSILENCER|ELECTRICAPPLIANCE|ELECTRICDISTRIBUTIONBOARD|FAN|FIRESUPPRESSIONTERMINAL|FLOWMETER|FLOWSEGMENT|FOOTING|JUNCTIONBOX|LIGHTFIXTURE|MEMBER|OUTLET|PILE|PIPEFITTING|PIPESEGMENT|PUMP|RAILING|RAMPFLIGHT|SLAB|STAIRFLIGHT|SWITCHINGDEVICE|SYSTEMFURNITUREELEMENT|TANK|VALVE|WALL|WASTETERMINAL|WINDOW|WALLSTANDARDCASE|BUILDINGELEMENTPROXY)\('([^']+)',#[^,]+,'([^']*)'/gi,
    process: ({ content, regex }) => extractProxies({ content, regex }),
    check: (value) => ({ value, passed: null }), // Pass if all objects pass (no proxies found)
  },
  {
    name: 'building-element-proxies',
    regex: /#(?<entityId>\d+)=IFCBUILDINGELEMENTPROXY\('(?<globalId>[^']+)',#[^,]+,'(?<name>[^']*)'/gi,
    process: ({ content, regex }) => {
      const results: PartialResult[] = []
      let match: RegExpExecArray | null

      while ((match = regex.exec(content)) !== null) {
        const globalId = match.groups!.globalId
        const name = match.groups!.name
        results.push({
          globalId,
          name,
          passed: !!name && name.trim() !== '', // Ensure name exists and is not empty
        })
      }

      return results
    },
    check: (value) => {
      // Check if all `passed` are `true`, then set `passed: null` to avoid icon display
      const allNamed = value.every((result) => result.passed)
      return { value, passed: allNamed ? null : false }
    },
  },
]
