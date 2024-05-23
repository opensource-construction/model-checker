import re

def identify_geometric_entities(content: str):
    shape_regex = re.compile(r"#(\d+)=IFCPRODUCTDEFINITIONSHAPE\([^;]*\);", re.IGNORECASE)
    referencing_entities_regex = re.compile(r"#(\d+)=IFC[^\(]*\('([^']+)',#\d+,'([^']+)',[^;]*#(\d+)[^;]*\);", re.IGNORECASE)

    shapes = set()
    geometric_entities = []

    print("Searching for IFCPRODUCTDEFINITIONSHAPE entities...")
    for match in shape_regex.finditer(content):
        shapes.add(match.group(1))
    print(f"Found {len(shapes)} IFCPRODUCTDEFINITIONSHAPE entities.")

    print("Searching for entities referencing these shapes...")
    for match in referencing_entities_regex.finditer(content):
        if match.group(4) in shapes:
            geometric_entities.append({
                'globalId': match.group(2),
                'name': match.group(3),
                'shapeId': match.group(4),
                'entityId': match.group(1),
                'passed': False
            })
    print(f"Found {len(geometric_entities)} geometric entities with associated geometry.")

    return geometric_entities

def check_storey_relation(content: str, geometric_entities):
    rel_contained_regex = re.compile(r"#(\d+)=IFCRELCONTAINEDINSPATIALSTRUCTURE\([^,]*,[^,]*,.*,(\(#[^)]*\)),#(\d+)\);", re.IGNORECASE)
    related_entities = {}

    print("Checking relation to IFCBUILDINGSTOREY...")
    for match in rel_contained_regex.finditer(content):
        entity_list = match.group(2)
        storey_id = match.group(3)
        entities = re.findall(r"#(\d+)", entity_list)
        for entity in entities:
            related_entities[entity] = storey_id

    print(f"Found {len(related_entities)} entities related to IFCBUILDINGSTOREY.")

    for entity in geometric_entities:
        if entity['entityId'] in related_entities:
            entity['passed'] = True
            entity['storeyId'] = related_entities[entity['entityId']]
        else:
            entity['storeyId'] = None
        print(f"Entity {entity['globalId']} relation to IFCBUILDINGSTOREY: {entity['passed']} (Storey ID: {entity.get('storeyId')})")

    return geometric_entities

def read_ifc_file(file_path: str) -> str:
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return ''

def main():
    file_path = 'C:/Users/LouisTrümpler/Documents/GitHub/IfcLCA/TestFiles/IFC_testfiles/2x3_CV_2.0.ifc'
    content = read_ifc_file(file_path)
    if content:
        geometric_entities = identify_geometric_entities(content)
        geometric_entities_with_relation = check_storey_relation(content, geometric_entities)
        print('Geometric Entities with associated geometry and storey relation:')
        for entity in geometric_entities_with_relation:
            print(entity)
    else:
        print('Failed to read the IFC content.')

if __name__ == '__main__':
    main()
