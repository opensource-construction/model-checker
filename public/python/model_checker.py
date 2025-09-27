#!/usr/bin/env python3

import sys
import subprocess
import pkg_resources
import os
import re
import argparse
import json
import base64
from datetime import datetime


def _clean_ids_text(value: str) -> str:
    if not value:
        return ''

    cleaned = re.sub(r'\s+', ' ', value)
    for token in ('{{#applicability}}', '{{/applicability}}', '{{.}}', '{{#value}}', '{{/value}}'):
        cleaned = cleaned.replace(token, '')
    return cleaned.strip()


def _format_enumeration(raw_list) -> str:
    if raw_list is None:
        return ''

    if isinstance(raw_list, (list, tuple)):
        items = [str(item).strip() for item in raw_list if str(item).strip()]
    else:
        items = [part.strip().strip("'\" ") for part in str(raw_list).split(',') if part.strip()]

    if not items:
        return ''

    formatted_items = [f'"{item}"' if re.search(r'[\s,]', item) else item for item in items]
    return ', '.join(formatted_items)


def format_ids_constraint(value) -> str:
    if value is None:
        return ''

    value_str = _clean_ids_text(str(value))
    if not value_str:
        return ''

    pattern_match = re.search(r"pattern':\s*'([^']+)'", value_str)
    if pattern_match:
        return f'matches pattern "{pattern_match.group(1)}"'

    enum_match = re.search(r"enumeration':\s*\[([^\]]+)\]", value_str)
    if enum_match:
        formatted = _format_enumeration(enum_match.group(1))
        if formatted:
            return f'is one of {formatted}'

    min_inc = re.search(r"minInclusive':\s*'([^']+)'", value_str)
    max_inc = re.search(r"maxInclusive':\s*'([^']+)'", value_str)
    min_exc = re.search(r"minExclusive':\s*'([^']+)'", value_str)
    max_exc = re.search(r"maxExclusive':\s*'([^']+)'", value_str)

    if min_inc and max_inc:
        return f'is between {min_inc.group(1)} and {max_inc.group(1)}'
    if min_exc and max_exc:
        return f'is between {min_exc.group(1)} and {max_exc.group(1)}'
    if min_inc:
        return f'is greater than or equal to {min_inc.group(1)}'
    if min_exc:
        return f'is greater than {min_exc.group(1)}'
    if max_inc:
        return f'is less than or equal to {max_inc.group(1)}'
    if max_exc:
        return f'is less than {max_exc.group(1)}'

    value_match = re.search(r"value':\s*'([^']+)'", value_str)
    if value_match:
        return f'equals "{value_match.group(1)}"'

    simple_match = re.search(r"simpleValue':\s*'([^']+)'", value_str)
    if simple_match:
        return f'equals "{simple_match.group(1)}"'

    bare = value_str.strip("'")
    if re.fullmatch(r'-?\d+(?:\.\d+)?', bare):
        return f'equals {bare}'
    if bare.lower() in {'true', 'false'}:
        return f'equals {bare.lower()}'

    return f'equals "{bare}"'

def check_dependencies():
    """Check and install required dependencies."""
    required = {'ifcopenshell', 'ifctester'}
    installed = {pkg.key for pkg in pkg_resources.working_set}
    missing = required - installed
    
    if missing:
        print(f"Installing missing dependencies: {', '.join(missing)}")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', *missing])
            print("Dependencies installed successfully!")
        except subprocess.CalledProcessError as e:
            print(f"Error installing dependencies: {str(e)}")
            sys.exit(1)

# Check and install dependencies before imports
check_dependencies()

import ifcopenshell
from ifctester import ids, reporter

def extract_requirement_data(requirement):
    """Extract structured data from IDS requirement for JSON output"""
    req_data = {
        "type": requirement.__class__.__name__,
        "cardinality": getattr(requirement, 'cardinality', 'required'),
        "status": "pass" if not getattr(requirement, 'failed_entities', []) else "fail"
    }
    
    # Extract requirement details based on type
    if hasattr(requirement, 'name') and requirement.name:
        req_data["name"] = str(requirement.name)
    if hasattr(requirement, 'value') and requirement.value:
        req_data["value"] = str(requirement.value)
    if hasattr(requirement, 'propertySet') and requirement.propertySet:
        req_data["propertySet"] = str(requirement.propertySet)
    if hasattr(requirement, 'baseName') and requirement.baseName:
        req_data["baseName"] = str(requirement.baseName)
    if hasattr(requirement, 'system') and requirement.system:
        req_data["system"] = str(requirement.system)
    if hasattr(requirement, 'instructions') and requirement.instructions:
        req_data["instructions"] = str(requirement.instructions)
        
    # Handle restrictions and patterns
    if hasattr(requirement, 'restriction'):
        restriction = requirement.restriction
        if hasattr(restriction, 'enumeration') and restriction.enumeration:
            req_data["enumeration"] = [str(val) for val in restriction.enumeration]
        if hasattr(restriction, 'pattern') and restriction.pattern:
            req_data["pattern"] = str(restriction.pattern)
        if hasattr(restriction, 'bounds') and restriction.bounds:
            req_data["bounds"] = str(restriction.bounds)
    
    # Extract failed/passed entities for detailed reporting - compute totals first
    failed_entities = list(getattr(requirement, 'failed_entities', []) or [])
    passed_entities = list(getattr(requirement, 'passed_entities', []) or [])
    
    # Store full counts for accurate metrics
    req_data["total_failed_entities"] = len(failed_entities)
    req_data["total_passed_entities"] = len(passed_entities)
    
    # Store only first 10 for display
    req_data["failed_entities"] = []
    for entity in failed_entities[:10]:  # Limit to first 10 for display
        entity_data = {
            "global_id": getattr(entity, 'GlobalId', ''),
            "class": entity.__class__.__name__,
            "predefined_type": getattr(entity, 'PredefinedType', 'NOTDEFINED'),
            "name": getattr(entity, 'Name', ''),
            "tag": getattr(entity, 'Tag', ''),
            "description": getattr(entity, 'Description', ''),
            "reason": getattr(entity, 'reason', '') or getattr(entity, 'failure_reason', '') or 'Validation failed'
        }
        req_data["failed_entities"].append(entity_data)
    
    req_data["passed_entities"] = []
    for entity in passed_entities[:10]:  # Limit to first 10 for display
        entity_data = {
            "global_id": getattr(entity, 'GlobalId', ''),
            "class": entity.__class__.__name__,
            "predefined_type": getattr(entity, 'PredefinedType', 'NOTDEFINED'),
            "name": getattr(entity, 'Name', ''),
            "tag": getattr(entity, 'Tag', ''),
            "description": getattr(entity, 'Description', ''),
            "reason": ''
        }
        req_data["passed_entities"].append(entity_data)
    
    # Set flags for omitted entities (more than 10)
    req_data["has_omitted_passes"] = len(passed_entities) > 10
    req_data["has_omitted_failures"] = len(failed_entities) > 10
            
    return req_data

def extract_applicability_data(applicability):
    """Extract applicability data for JSON output"""
    if not applicability:
        return None
        
    app_data = {}
    
    if hasattr(applicability, 'entity') and applicability.entity:
        entity = applicability.entity
        entity_name = getattr(entity, 'name', None) or getattr(entity, 'Name', None)
        predefined_type = getattr(entity, 'predefinedType', None) or getattr(entity, 'PredefinedType', None)
        app_data["entity"] = {
            "name": str(entity_name) if entity_name else None,
            "predefinedType": str(predefined_type) if predefined_type else None
        }
    
    if hasattr(applicability, 'classification') and applicability.classification:
        app_data["classification"] = []
        classifications = applicability.classification if isinstance(applicability.classification, list) else [applicability.classification]
        for cls in classifications:
            cls_data = {
                "system": str(cls.system) if cls.system else None,
                "value": str(cls.value) if cls.value else None
            }
            app_data["classification"].append(cls_data)
    
    if hasattr(applicability, 'attribute') and applicability.attribute:
        app_data["attribute"] = []
        attributes = applicability.attribute if isinstance(applicability.attribute, list) else [applicability.attribute]
        for attr in attributes:
            attr_data = {
                "name": str(attr.name) if attr.name else None,
                "value": format_ids_constraint(attr.value)
            }
            app_data["attribute"].append(attr_data)
    
    if hasattr(applicability, 'property') and applicability.property:
        app_data["property"] = []
        properties = applicability.property if isinstance(applicability.property, list) else [applicability.property]
        for prop in properties:
            prop_data = {
                "propertySet": str(prop.propertySet) if prop.propertySet else None,
                "baseName": str(prop.baseName) if prop.baseName else None,
                "value": format_ids_constraint(prop.value)
            }
            app_data["property"].append(prop_data)
    
    if hasattr(applicability, 'material') and applicability.material:
        app_data["material"] = []
        materials = applicability.material if isinstance(applicability.material, list) else [applicability.material]
        for mat in materials:
            mat_data = {
                "value": str(mat.value) if mat.value else None
            }
            app_data["material"].append(mat_data)
            
    return app_data if app_data else None

def validate_ifc_ids_json(ifc_path: str, ids_path: str, lang: str = "en"):
    """
    Validate IFC against IDS and return structured JSON data for frontend processing.
    This generates the same data that would be used in HTML templates but in JSON format.
    
    Args:
        ifc_path: Path to the IFC file
        ids_path: Path to the IDS specification file  
        lang: Language code for report (used for metadata only)
        
    Returns:
        JSON string with structured validation results
    """
    try:
        # Validate paths
        if not os.path.exists(ifc_path):
            raise FileNotFoundError(f"IFC file not found: {ifc_path}")
        if not os.path.exists(ids_path):
            raise FileNotFoundError(f"IDS file not found: {ids_path}")

        print(f"Opening IFC file: {ifc_path}")
        ifc_model = ifcopenshell.open(ifc_path)
        
        print(f"Loading IDS specification: {ids_path}")
        ids_spec = ids.open(ids_path)
        
        if not ids_spec or not ids_spec.specifications:
            raise ValueError("Invalid or empty IDS specification")

        print("Validating IFC against IDS...")
        ids_spec.validate(ifc_model)
        
        # Build structured results that match the HTML template structure
        results = {
            # Template metadata
            "title": f"IDS Validation Report",
            "filename": os.path.basename(ifc_path),
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "language_code": lang,
            "_lang": lang,
            
            # Overall summary statistics  
            "total_specifications": len(ids_spec.specifications),
            "total_specifications_pass": 0,
            "total_specifications_fail": 0,
            "total_requirements": 0,
            "total_requirements_pass": 0, 
            "total_requirements_fail": 0,
            "total_checks": 0,
            "total_checks_pass": 0,
            "total_checks_fail": 0,
            "total_applicable": 0,
            "total_applicable_pass": 0,
            "total_applicable_fail": 0,
            
            # Individual specifications
            "specifications": []
        }
        
        # Process each specification to match HTML template structure
        for spec in ids_spec.specifications:
            spec_data = {
                "name": spec.name,
                "description": getattr(spec, 'description', ''),
                "instructions": getattr(spec, 'instructions', ''),
                "identifier": getattr(spec, 'identifier', ''),
                "ifcVersion": getattr(spec, 'ifcVersion', []),

                # Status and statistics (will be computed from actual requirement results)
                "status": True,
                "status_text": "PASS",
                "total_checks": 0,
                "total_checks_pass": 0,
                "total_checks_fail": 0,
                "percent_checks_pass": 0,
                "total_applicable": 0,
                "total_applicable_pass": 0,
                "total_applicable_fail": 0,
                
                # Applicability and requirements
                "applicability": [],
                "requirements": []
            }
            
            # Extract applicability
            if hasattr(spec, 'applicability') and spec.applicability:
                app_data = extract_applicability_data(spec.applicability)
                if app_data:
                    # Convert to display format for template
                    app_display = []
                    if app_data.get('entity'):
                        entity_text = f"All {app_data['entity']['name']} data"
                        if app_data['entity']['predefinedType']:
                            entity_text += f" with PredefinedType {app_data['entity']['predefinedType']}"
                        app_display.append(entity_text)
                    
                    for prop in app_data.get('property', []):
                        prop_text = f"Property {prop['baseName']} in set {prop['propertySet']}"
                        if prop['value']:
                            prop_text += f" with value {prop['value']}"
                        app_display.append(prop_text)
                    
                    spec_data["applicability"] = app_display
            
            # Extract requirements
            if hasattr(spec, 'requirements') and spec.requirements:
                for req in spec.requirements:
                    req_data = extract_requirement_data(req)
                    
                    # Build requirement display data using real totals (not truncated display lists)
                    total_pass = req_data.get("total_passed_entities", len(req_data.get("passed_entities", [])))
                    total_fail = req_data.get("total_failed_entities", len(req_data.get("failed_entities", [])))
                    
                    req_display = {
                        "description": format_requirement_description(req_data),
                        "status": req_data["status"] == "pass",
                        "total_checks": total_pass + total_fail,
                        "total_pass": total_pass,
                        "total_fail": total_fail,
                        "passed_entities": req_data.get("passed_entities", []),
                        "failed_entities": req_data.get("failed_entities", []),
                        "has_omitted_passes": total_pass > len(req_data.get("passed_entities", [])),
                        "has_omitted_failures": total_fail > len(req_data.get("failed_entities", []))
                    }
                    
                    spec_data["requirements"].append(req_display)
                    
                    # Update counters
                    spec_data["total_checks"] += req_display["total_checks"]
                    spec_data["total_checks_pass"] += req_display["total_pass"]
                    spec_data["total_checks_fail"] += req_display["total_fail"]
                    spec_data["total_applicable"] += req_display["total_checks"]
                    spec_data["total_applicable_pass"] += req_display["total_pass"]
                    spec_data["total_applicable_fail"] += req_display["total_fail"]

                    # Update global requirement counters
                    results["total_requirements"] += 1
                    if req_display["total_fail"] > 0:
                        results["total_requirements_fail"] += 1
                    else:
                        results["total_requirements_pass"] += 1
            
            # Calculate percentages
            if spec_data["total_checks"] > 0:
                spec_data["percent_checks_pass"] = round((spec_data["total_checks_pass"] / spec_data["total_checks"]) * 100)
            else:
                spec_data["percent_checks_pass"] = 0

            # Compute spec status from actual requirement results
            spec_data["status"] = spec_data["total_checks_fail"] == 0
            spec_data["status_text"] = "PASS" if spec_data["status"] else "FAIL"
            
            results["specifications"].append(spec_data)
            
            # Update overall counters
            if spec_data["status"]:
                results["total_specifications_pass"] += 1
            else:
                results["total_specifications_fail"] += 1
                
            results["total_checks"] += spec_data["total_checks"]
            results["total_checks_pass"] += spec_data["total_checks_pass"]
            results["total_checks_fail"] += spec_data["total_checks_fail"]
        
        # Calculate overall percentages
        if results["total_checks"] > 0:
            results["percent_checks_pass"] = round((results["total_checks_pass"] / results["total_checks"]) * 100)
        else:
            results["percent_checks_pass"] = 0
            
        results["status"] = results["total_specifications_fail"] == 0
        results["status_text"] = "PASS" if results["status"] else "FAIL"
        
        # Generate BCF data
        print("Generating BCF data...")
        try:
            bcf_reporter = reporter.Bcf(ids_spec)
            bcf_reporter.report()
            
            # Create BCF in memory
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.bcf', delete=False) as tmp_file:
                bcf_reporter.to_file(tmp_file.name)
                with open(tmp_file.name, 'rb') as f:
                    bcf_bytes = f.read()
                results["bcf_data"] = {
                    "zip_content": base64.b64encode(bcf_bytes).decode('utf-8'),
                    "filename": f"{os.path.splitext(os.path.basename(ifc_path))[0]}.bcf"
                }
                os.unlink(tmp_file.name)  # Clean up
        except Exception as bcf_error:
            print(f"BCF generation failed: {bcf_error}")
            results["bcf_data"] = None
        
        return json.dumps(results, ensure_ascii=False, indent=2)
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "status": "error",
            "title": "Validation Error",
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        return json.dumps(error_result, ensure_ascii=False)

def format_requirement_description(req_data):
    """Format requirement data into human-readable description"""
    req_type = req_data.get("type", "")
    
    if "Property" in req_type:
        constraint = format_ids_constraint(req_data.get("value"))
        if constraint:
            return f"{req_data.get('baseName', 'Property')} shall be {constraint} in the dataset {req_data.get('propertySet', 'PropertySet')}"
        return f"{req_data.get('baseName', 'Property')} shall be provided in the dataset {req_data.get('propertySet', 'PropertySet')}"
    
    elif "Entity" in req_type:
        if req_data.get("enumeration"):
            formatted_enum = ', '.join(req_data.get("enumeration", []))
            if formatted_enum:
                return f"The {req_data.get('name', 'Name')} shall be one of {formatted_enum}"
        constraint = format_ids_constraint(req_data.get("value"))
        if constraint:
            return f"The {req_data.get('name', 'Name')} shall be {constraint}"
        return f"The {req_data.get('name', 'Name')} shall be provided"
    
    elif "Attribute" in req_type:
        constraint = format_ids_constraint(req_data.get("value"))
        if constraint:
            return f"The {req_data.get('name', 'Attribute')} shall be {constraint}"
        return f"The {req_data.get('name', 'Attribute')} shall be provided"
    
    elif "Classification" in req_type:
        constraint = format_ids_constraint(req_data.get("value"))
        descr = f"Classification {constraint or ''}"
        if req_data.get('system'):
            descr += f" in system {req_data.get('system')}"
        return descr.strip()
    
    elif "Material" in req_type:
        constraint = format_ids_constraint(req_data.get("value"))
        if constraint:
            return f"Material shall be {constraint}"
        return "Material shall be provided"
    
    else:
        constraint = format_ids_constraint(req_data.get("value"))
        if constraint:
            return f"{req_type}: {req_data.get('name', '')} {constraint}"
        return f"{req_type}: {req_data.get('name', '')} shall be provided"

def main():
    # Set up argument parser  
    parser = argparse.ArgumentParser(description="IFC Model Checker - Validate IFC files against IDS specifications")
    parser.add_argument("--ifc", "-i", help="Path to the IFC file")
    parser.add_argument("--ids", "-s", help="Path to the IDS specification file") 
    parser.add_argument("--lang", "-l", default="en", help="Language for the report (default: en)")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of running interactively")
    args = parser.parse_args()
    
    # If JSON mode, return structured data for the worker
    if args.json and args.ifc and args.ids:
        try:
            result_json = validate_ifc_ids_json(args.ifc, args.ids, args.lang)
            print(result_json)  # This will be captured by the worker
        except Exception as e:
            error_json = json.dumps({"error": str(e)}, ensure_ascii=False)
            print(error_json)
        return
    
    # Interactive mode for testing
    if not args.ifc:
        args.ifc = input("Enter path to IFC file: ")
    if not args.ids:
        args.ids = input("Enter path to IDS file: ")
    if not args.lang:
        args.lang = input("Enter language code (default: en): ") or "en"
    
    try:
        result_json = validate_ifc_ids_json(args.ifc, args.ids, args.lang)
        result = json.loads(result_json)
        
        if "error" in result:
            print(f"Error: {result['error']}")
            sys.exit(1)
        else:
            print(f"\nValidation {result['status_text']}!")
            print(f"Total specifications: {result['total_specifications']}")
            print(f"Passed: {result['total_specifications_pass']}")
            print(f"Failed: {result['total_specifications_fail']}")
            print(f"Total checks: {result['total_checks']}")
            print(f"Success rate: {result['percent_checks_pass']}%")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 