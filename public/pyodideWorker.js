/* eslint-disable */
importScripts('https://cdn.jsdelivr.net/pyodide/v0.22.1/full/pyodide.js')

let pyodide

async function initPyodide() {
    try {
        self.postMessage({ type: 'progress', message: 'Loading Pyodide...' })
        pyodide = await loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.22.1/full/',
            memory: 1024 * 1024 * 1024,
        })

        self.postMessage({ type: 'progress', message: 'Setting up package manager...' })
        await pyodide.loadPackage(['micropip'])

        self.postMessage({ type: 'progress', message: 'Installing IfcOpenShell...' })
        await pyodide.runPythonAsync(`
        import micropip
        await micropip.install('https://ifcopenshell.github.io/wasm-preview/IfcOpenShell-0.7.0-py3-none-any.whl')
      `)

        self.postMessage({ type: 'progress', message: 'Installing IFC validation tools...' })
        await pyodide.runPythonAsync(`
        await micropip.install('ifctester')
      `)

        self.postMessage({ type: 'progress', message: 'Installing template engine...' })
        await pyodide.runPythonAsync(`
        await micropip.install('pystache')
      `)

        self.postMessage({ type: 'progress', message: 'Setup complete!' })
        return true
    } catch (error) {
        console.error('Failed to load Pyodide:', error)
        self.postMessage({ type: 'error', message: `Failed to load Pyodide: ${error.message}` })
        throw new Error(`Failed to load Pyodide: ${error.message}`)
    }
}

let pyodideReady = false

self.onmessage = async (event) => {
    const { arrayBuffer, idsContent } = event.data

    try {
        // Load Pyodide if not already loaded
        if (!pyodideReady) {
            pyodideReady = await initPyodide()
        }

        // Debug input data
        console.debug('Worker received:', {
            arrayBufferSize: arrayBuffer?.byteLength,
            idsContentLength: idsContent?.length,
            idsContentStart: idsContent?.substring(0, 100)
        })

        // Create Uint8Array from array buffer and set Python variables
        const uint8Array = new Uint8Array(arrayBuffer)
        pyodide.globals.set('uint8Array', uint8Array)
        pyodide.globals.set('idsContent', idsContent)

        // Updated Python validation code
        const result = await pyodide.runPythonAsync(`
import json
import logging
import io
import ifcopenshell
import ifctester.ids
import ifctester.reporter
import tempfile
import os
from datetime import datetime

# Custom JSON Encoder to handle ifctester objects
class IdsEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, '__dict__'):
            return obj.__dict__
        if hasattr(obj, 'to_json'):
            return obj.to_json()
        try:
            return super().default(obj)
        except:
            return str(obj)

# Set up logging
logger = logging.getLogger('ifc_validator')
logger.setLevel(logging.DEBUG)
stream_handler = logging.StreamHandler(io.StringIO())
stream_handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(levelname)s: %(message)s')
stream_handler.setFormatter(formatter)
logger.addHandler(stream_handler)

# Add required utility functions
def get_pset(element, pset_name):
    if not element:
        return None
    try:
        for relationship in element.IsDefinedBy:
            if relationship.is_a('IfcRelDefinesByProperties'):
                definition = relationship.RelatingPropertyDefinition
                if definition.is_a('IfcPropertySet') and definition.Name == pset_name:
                    return definition
    except Exception as e:
        logger.warning(f"Error getting property set {pset_name}: {str(e)}")
    return None

def get_property(element, pset_name, property_name):
    try:
        pset = get_pset(element, pset_name)
        if pset and hasattr(pset, 'HasProperties'):
            for prop in pset.HasProperties:
                if prop.Name == property_name:
                    if prop.is_a('IfcPropertySingleValue'):
                        return prop.NominalValue.wrappedValue if hasattr(prop.NominalValue, 'wrappedValue') else prop.NominalValue
                    return prop
    except Exception as e:
        logger.warning(f"Error getting property {property_name} from {pset_name}: {str(e)}")
    return None

# Monkey patch the missing functions
if not hasattr(ifcopenshell.util, 'element'):
    class ElementUtils:
        @staticmethod
        def get_pset(element, pset_name):
            return get_pset(element, pset_name)
        
        @staticmethod
        def get_property(element, pset_name, property_name):
            return get_property(element, pset_name, property_name)
    
    ifcopenshell.util.element = ElementUtils()
else:
    if not hasattr(ifcopenshell.util.element, 'get_pset'):
        ifcopenshell.util.element.get_pset = get_pset
    if not hasattr(ifcopenshell.util.element, 'get_property'):
        ifcopenshell.util.element.get_property = get_property

# Process validation results to ensure JSON serialization
def process_results(obj):
    if isinstance(obj, dict):
        return {k: process_results(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [process_results(item) for item in obj]
    elif hasattr(obj, 'parameters'):
        # Handle facet parameters
        params = obj.parameters
        if isinstance(params, dict):
            result = {}
            for key, value in params.items():
                if isinstance(value, (str, int, float, bool, type(None))):
                    result[key] = value
                elif hasattr(value, 'options'):
                    result[key] = {'options': value.options, 'base': value.base}
                else:
                    result[key] = str(value)
            return result
        elif isinstance(params, list):
            return [process_results(item) for item in params]
        return str(params)
    elif hasattr(obj, '__dict__'):
        return process_results(obj.__dict__)
    elif hasattr(obj, 'to_json'):
        return obj.to_json()
    return str(obj) if not isinstance(obj, (str, int, float, bool, type(None))) else obj

# Process specifications
def process_specification(spec):
    logger.debug(f"\\nProcessing specification: {spec.name if hasattr(spec, 'name') else 'Unknown'}")
    
    result = {
        'name': spec.name if hasattr(spec, 'name') else 'Unknown',
        'description': spec.description if hasattr(spec, 'description') else '',
        'applicability': [],
        'requirements': []
    }
    
    # Process applicability
    if hasattr(spec, 'applicability'):
        logger.debug(f"Processing applicability rules for {result['name']}")
        for i, app in enumerate(spec.applicability):
            logger.debug(f"  Applicability rule {i+1}:")
            logger.debug(f"    Type: {app.__class__.__name__}")
            
            if hasattr(app, 'parameters'):
                logger.debug(f"    Parameters type: {type(app.parameters)}")
                logger.debug(f"    Parameters: {app.parameters}")
                
                # Get the template for this applicability type
                template = ""
                if hasattr(app, 'applicability_templates') and app.applicability_templates:
                    template = app.applicability_templates[0]
                    logger.debug(f"    Template: {template}")
                
                # Process parameters
                params = {}
                if hasattr(app, 'parameters'):
                    logger.debug("    Processing parameters:")
                    for key in app.parameters:
                        if hasattr(app, key):
                            value = getattr(app, key)
                            logger.debug(f"      {key}: {value} (type: {type(value)})")
                            if isinstance(value, (str, int, float, bool, type(None))):
                                params[key] = value
                            elif hasattr(value, 'options'):
                                params[key] = {'options': value.options, 'base': value.base}
                            else:
                                params[key] = str(value)
                
                # Format template with parameters
                try:
                    description = template.format(**{k: v for k, v in params.items() if not k.startswith('@')})
                    logger.debug(f"    Formatted description: {description}")
                except Exception as e:
                    logger.debug(f"    Error formatting description: {str(e)}")
                    description = f"All {params.get('name', 'Unknown')} data"
                
                result['applicability'].append({
                    'type': app.__class__.__name__,
                    'description': description,
                    'parameters': params
                })
    
    # Process requirements
    if hasattr(spec, 'requirements'):
        logger.debug(f"Processing requirements for {result['name']}")
        for i, req in enumerate(spec.requirements):
            logger.debug(f"  Requirement {i+1}:")
            logger.debug(f"    Type: {req.__class__.__name__}")
            
            if hasattr(req, 'parameters'):
                logger.debug(f"    Parameters type: {type(req.parameters)}")
                logger.debug(f"    Parameters: {req.parameters}")
                
                # Get the template for this requirement type
                template = ""
                if hasattr(req, 'requirement_templates') and req.requirement_templates:
                    template = req.requirement_templates[0]
                    logger.debug(f"    Template: {template}")
                
                # Process parameters
                params = {}
                if hasattr(req, 'parameters'):
                    logger.debug("    Processing parameters:")
                    for key in req.parameters:
                        if hasattr(req, key):
                            value = getattr(req, key)
                            logger.debug(f"      {key}: {value} (type: {type(value)})")
                            if isinstance(value, (str, int, float, bool, type(None))):
                                params[key] = value
                            elif hasattr(value, 'options'):
                                params[key] = {'options': value.options, 'base': value.base}
                            else:
                                params[key] = str(value)
                
                # Format template with parameters
                try:
                    description = template.format(**{k: v for k, v in params.items() if not k.startswith('@')})
                    logger.debug(f"    Formatted description: {description}")
                except Exception as e:
                    logger.debug(f"    Error formatting description: {str(e)}")
                    if req.__class__.__name__ == 'Property':
                        description = f"Property {params.get('baseName', 'Unknown')} in {params.get('propertySet', 'Unknown')}"
                    else:
                        description = f"Requirement of type {req.__class__.__name__}"
                
                # Log validation status
                logger.debug(f"    Status: {req.status if hasattr(req, 'status') else None}")
                logger.debug(f"    Passed entities: {len(req.passed_entities) if hasattr(req, 'passed_entities') else 0}")
                logger.debug(f"    Failures: {len(req.failures) if hasattr(req, 'failures') else 0}")
                
                requirement = {
                    'type': req.__class__.__name__,
                    'description': description,
                    'parameters': params,
                    'status': req.status if hasattr(req, 'status') else None,
                    'passed_entities': len(req.passed_entities) if hasattr(req, 'passed_entities') else 0,
                    'failed_entities': []
                }
                
                # Process failures
                if hasattr(req, 'failures'):
                    for j, failure in enumerate(req.failures):
                        logger.debug(f"    Processing failure {j+1}:")
                        if isinstance(failure, dict) and 'reason' in failure:
                            entity = failure.get('element')
                            if entity:
                                logger.debug(f"      Entity ID: {entity.id() if hasattr(entity, 'id') else 'Unknown'}")
                                logger.debug(f"      Entity Type: {entity.is_a() if hasattr(entity, 'is_a') else 'Unknown'}")
                                # Extract GlobalId from IFC entity
                                global_id = None
                                try:
                                    if hasattr(entity, 'GlobalId'):
                                        global_id = entity.GlobalId
                                    elif hasattr(entity, 'get_info'):
                                        info = entity.get_info()
                                        global_id = info.get('GlobalId')
                                except:
                                    global_id = None
                                
                                logger.debug(f"      GlobalId: {global_id if global_id else 'Unknown'}")
                                logger.debug(f"      Reason: {failure['reason']}")
                                
                                entity_data = {
                                    'id': entity.id() if hasattr(entity, 'id') else 'Unknown',
                                    'type': entity.is_a() if hasattr(entity, 'is_a') else 'Unknown',
                                    'global_id': global_id if global_id else 'Unknown',
                                    'reason': failure['reason']
                                }
                                
                                # Try to get additional attributes if available
                                try:
                                    if hasattr(entity, 'Name'):
                                        entity_data['name'] = entity.Name
                                    if hasattr(entity, 'Description'):
                                        entity_data['description'] = entity.Description
                                    if hasattr(entity, 'Tag'):
                                        entity_data['tag'] = entity.Tag
                                except:
                                    pass
                                
                                requirement['failed_entities'].append(entity_data)
                
                result['requirements'].append(requirement)
    
    return result

logger.info("Starting validation...")

try:
    # Load IFC model
    from js import TextDecoder
    decoder = TextDecoder.new('utf-8')
    ifc_content = decoder.decode(uint8Array)
    
    ifc = ifcopenshell.file.from_string(ifc_content)
    logger.debug(f"IFC Schema: {ifc.schema}")
    
    # Map schema version
    schema_map = {
        'IFC2X3': 'IFC2X3',
        'IFC4': 'IFC4',
        'IFC4X3': 'IFC4X3_ADD2'
    }
    schema_version = schema_map.get(ifc.schema, 'IFC4')
    
    # Add schema identifier to file object
    ifc.schema_identifier = schema_version
    
    # Parse IDS content to get target schema version
    import xml.etree.ElementTree as ET
    ids_root = ET.fromstring(idsContent)
    ids_version = ids_root.get('ifcVersion', 'IFC4')  # Default to IFC4 if not specified
    
    # Check version compatibility
    version_compatible = False
    if isinstance(ids_version, str):
        # Handle multiple versions separated by spaces
        target_versions = ids_version.split()
        version_compatible = schema_version in target_versions
    else:
        version_compatible = schema_version == ids_version
    
    logger.info(f"IFC Schema Version: {schema_version}")
    logger.info(f"IDS Target Version(s): {ids_version}")
    logger.info(f"Version Compatible: {version_compatible}")
    
    # Add version info to stats
    stats = {
        'schema_version': schema_version,
        'ids_version': ids_version,
        'version_compatible': version_compatible,
        'total_entities': len(list(ifc)),
        'products': len(list(ifc.by_type('IfcProduct'))),
        'walls': len(list(ifc.by_type('IfcWall'))),
        'spaces': len(list(ifc.by_type('IfcSpace'))),
        'storeys': len(list(ifc.by_type('IfcBuildingStorey')))
    }
    
    # Write IDS content to temporary file
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, 'temp_ids.xml')
    
    logger.debug("IDS Content Preview:")
    logger.debug(idsContent[:500] + "..." if len(idsContent) > 500 else idsContent)
    
    with open(temp_path, 'w', encoding='utf-8') as f:
        f.write(idsContent)
    
    # Load IDS using open method
    validator = ifctester.ids.open(temp_path)
    logger.debug(f"Loaded IDS file from {temp_path}")
    logger.debug(f"Number of specifications: {len(validator.specifications)}")
    
    # Log specifications for debugging
    for i, spec in enumerate(validator.specifications):
        logger.debug(f"Specification {i+1}: {spec.name}")
    
    # Perform validation with version compatibility check
    if version_compatible:
        validation_result = validator.validate(ifc, should_filter_version=False)
    else:
        logger.warning(f"Schema version mismatch: IFC file is {schema_version} but IDS requires {ids_version}")
        # Create a dummy validation result for incompatible versions
        validation_result = {
            'status': 'version_mismatch',
            'specifications': [],
            'message': f"Schema version mismatch: IFC file is {schema_version} but IDS requires {ids_version}. Some validations may fail or be skipped."
        }
    
    # Clean up temporary file
    try:
        os.remove(temp_path)
    except:
        pass
    
    # Generate reports
    logger.debug("Generating reports...")
    
    # Generate JSON report first to get validation results
    json_reporter = ifctester.reporter.Json(validator)
    validation_results = json_reporter.report()
    
    # Debug log to see actual status values
    logger.debug("Validation Results Structure:")
    for spec in validation_results['specifications']:
        logger.debug(f"Specification '{spec['name']}' Status: {spec['status']}")
        for req in spec['requirements']:
            logger.debug(f"  Requirement Status: {req['status']}")
    
    # Generate HTML report with Bonsai-style structure
    html_reporter = ifctester.reporter.Html(validator)
    html_reporter.entity_limit = 1000
    
    detailed_report = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>IFC Model Checker Report</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                color: #333;
            }}
            .header {{
                background: #2c3e50;
                color: white;
                padding: 20px;
                margin: -20px -20px 20px -20px;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
                text-align: center;
                margin-bottom: 20px;
            }}
            .header-content {{
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
            }}
            .header-section {{
                padding: 15px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
            }}
            .header-section h2 {{
                margin: 0 0 10px 0;
                font-size: 18px;
                color: #ecf0f1;
            }}
            .meta-info {{
                font-size: 14px;
                color: #ecf0f1;
            }}
            .meta-info div {{
                margin-bottom: 5px;
            }}
            .specification {{
                background: white;
                border-radius: 4px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .specification-header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }}
            .specification-header h3 {{
                margin: 0;
                font-size: 18px;
            }}
            .pass-rate {{
                font-weight: bold;
                padding: 4px 8px;
                border-radius: 4px;
            }}
            .pass-rate.good {{ background: #e8f5e9; color: #2e7d32; }}
            .pass-rate.bad {{ background: #ffebee; color: #c62828; }}
            .requirement {{
                border-left: 3px solid #e0e0e0;
                padding: 10px;
                margin: 10px 0;
            }}
            .requirement.passed {{ border-left-color: #2ecc71; }}
            .requirement.failed {{ border-left-color: #e74c3c; }}
            .requirement-header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            .status {{
                font-weight: 500;
                padding: 2px 6px;
                border-radius: 3px;
            }}
            .status.passed {{
                background: #2ecc71;
                color: white;
            }}
            .status.failed {{
                background: #e74c3c;
                color: white;
            }}
            .failed-entities {{
                margin-top: 10px;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 4px;
                display: none;
            }}
            .failed-entities.show {{
                display: block;
            }}
            .failed-entity {{
                padding: 8px;
                border-left: 3px solid #e74c3c;
                margin: 5px 0;
                background: white;
            }}
            .toggle-entities {{
                cursor: pointer;
                color: #2980b9;
                font-size: 14px;
                margin-top: 5px;
            }}
            .stats-summary {{
                display: flex;
                gap: 10px;
                margin-top: 5px;
                font-size: 14px;
            }}
            .stat-item {{
                padding: 2px 6px;
                border-radius: 3px;
                background: #f5f5f5;
            }}
            .collapsible {{
                background-color: #f8f9fa;
                color: #2980b9;
                cursor: pointer;
                padding: 8px 12px;
                width: 100%;
                border: none;
                text-align: left;
                outline: none;
                font-size: 14px;
                margin-top: 5px;
                border-radius: 4px;
                transition: background-color 0.3s ease;
            }}
            .collapsible:hover {{
                background-color: #e9ecef;
            }}
            .collapsible:after {{
                content: '\\002B';
                color: #2980b9;
                font-weight: bold;
                float: right;
                margin-left: 5px;
            }}
            .active:after {{
                content: "\\2212";
            }}
            .content {{
                padding: 0;
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.2s ease-out;
                background-color: #f8f9fa;
                border-radius: 4px;
            }}
            .failed-entity {{
                padding: 8px;
                border-left: 3px solid #e74c3c;
                margin: 5px 0;
                background: white;
            }}
            .print-button {{
                position: absolute;
                top: 20px;
                right: 20px;
                background-color: #2ecc71;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                transition: background-color 0.2s ease;
            }}
            .print-button:hover {{
                background-color: #27ae60;
            }}
            .print-button svg {{
                width: 16px;
                height: 16px;
                fill: currentColor;
            }}
            @media print {{
                .print-button {{
                    display: none;
                }}
                .collapsible {{
                    display: none;
                }}
                .content {{
                    max-height: none !important;
                    display: block !important;
                }}
            }}
        </style>
        <script>
            document.addEventListener('DOMContentLoaded', function() {{
                // Collapsible functionality
                var coll = document.getElementsByClassName("collapsible");
                for (var i = 0; i < coll.length; i++) {{
                    coll[i].addEventListener("click", function() {{
                        this.classList.toggle("active");
                        var content = this.nextElementSibling;
                        if (content.style.maxHeight) {{
                            content.style.maxHeight = null;
                        }} else {{
                            content.style.maxHeight = content.scrollHeight + "px";
                        }}
                    }});
                }}
                // Print functionality
                document.getElementById('print-button').addEventListener('click', function() {{
                    window.print();
                }});
            }});
        </script>
    </head>
    <body>
        <div class="header">
            <h1>IFC Model Checker Report</h1>
            <div class="header-content">
                <div class="header-section">
                    <h2>File Information</h2>
                    <div class="meta-info">
                        <div>Schema Version: {ifc.schema}</div>
                        <div>IDS Target Version: {ids_version}</div>
                        <div style="color: {'#2ecc71' if version_compatible else '#e74c3c'}">
                            Version Compatibility: {'Compatible' if version_compatible else 'Incompatible - Some checks may fail'}
                        </div>
                        <div>File: {ifc_path if 'ifc_path' in locals() else 'Uploaded File'}</div>
                    </div>
                </div>
                <div class="header-section">
                    <h2>Basic Statistics</h2>
                    <div class="meta-info">
                        <div>Total Entities: {stats['total_entities']}</div>
                        <div>Products: {stats['products']}</div>
                        <div>Walls: {stats['walls']}</div>
                        <div>Spaces: {stats['spaces']}</div>
                        <div>Storeys: {stats['storeys']}</div>
                    </div>
                </div>
                <div class="header-section">
                    <h2>Validation Status</h2>
                    <div class="meta-info">
                        <div>Validation Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
                        <div>Total Specifications: {validation_results['total_specifications']}</div>
                        <div>Total Checks: {validation_results['total_checks']}</div>
                        <div style="color: #2ecc71">Passed: {validation_results['total_checks_pass']}</div>
                        <div style="color: #e74c3c">Failed: {validation_results['total_checks_fail']}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="specifications">
            <h2>Detailed Results</h2>
    """
    
    # Add specifications from validation results
    for spec_index, spec in enumerate(validation_results['specifications']):
        status_class = 'passed' if spec['status'] is True else 'failed'
        status_text = 'True' if spec['status'] is True else 'False'
        
        # Calculate pass rate for this specification
        total_reqs = len(spec['requirements'])
        passed_reqs = sum(1 for req in spec['requirements'] if req['status'] is True)
        pass_rate = (passed_reqs / total_reqs * 100) if total_reqs > 0 else 0
        
        detailed_report += f"""
            <div class="specification {status_class}">
                <div class="specification-header">
                    <h3>{spec['name']}</h3>
                    <span class="pass-rate {'good' if pass_rate >= 50 else 'bad'}">{pass_rate:.0f}%</span>
                </div>
                <div class="description">{spec['description']}</div>
                <div class="stats-summary">
                    <span class="stat-item">Requirements passed: {passed_reqs}/{total_reqs}</span>
                    <span class="stat-item">Status: <span class="status {status_class}">{status_text}</span></span>
                </div>
                <div class="requirements">
        """
        
        for req_index, req in enumerate(spec['requirements']):
            status_class = 'passed' if req['status'] is True else 'failed'
            status_text = 'True' if req['status'] is True else 'False'
            
            # Format requirement text
            if isinstance(req, dict):
                if 'description' in req:
                    req_text = req['description']
                elif req.get('type') == 'Property':
                    constraints = ''
                    if isinstance(req.get('value'), dict):
                        constraints = ', '.join(f"{k}: {v if not isinstance(v, list) else ', '.join(v)}"
                                             for k, v in req['value'].items())
                    req_text = f"{req.get('propertyName', '')} {constraints}"
                else:
                    req_text = str(req)
            else:
                req_text = str(req)
            
            # Generate unique ID for this requirement
            req_id = f"req-{spec_index}-{req_index}"
            
            detailed_report += f"""
                <div class="requirement {status_class}">
                    <div class="requirement-header">
                        <span>{req_text}</span>
                        <span class="status {status_class}">{status_text}</span>
                    </div>
            """
            
            # Add failed entities section if there are any
            if req.get('failed_entities'):
                failed_count = len(req['failed_entities'])
                detailed_report += f"""
                    <button class="collapsible">Show Failed Entities ({failed_count})</button>
                    <div class="content">
                """
                
                for entity in req['failed_entities']:
                    detailed_report += f"""
                        <div class="failed-entity">
                            <div><strong>{entity.get('type', 'Unknown')} | {entity.get('name', 'Unnamed')}</strong></div>
                            <div>GlobalId: {entity.get('global_id', 'Unknown')}</div>
                            <div>ID: {entity.get('id', 'Unknown')}</div>
                            <div>Tag: {entity.get('tag', 'N/A')}</div>
                            <div>Description: {entity.get('description', 'N/A')}</div>
                            <div>Reason: {entity.get('reason', 'Unknown')}</div>
                        </div>
                    """
                
                detailed_report += """
                    </div>
                """
            
            detailed_report += """
                </div>
            """
        
        detailed_report += """
                </div>
            </div>
        """
    
    detailed_report += """
        </div>
    </body>
    </html>
    """
    
    # Process validation results
    processed_specs = []
    total_checks = 0
    passed_checks = 0
    failed_checks = 0
    
    for spec in validation_results['specifications']:
        processed_spec = {
            'name': spec['name'],
            'description': spec['description'],
            'applicability': spec['applicability'],
            'requirements': []
        }
        
        for req in spec['requirements']:
            requirement = {
                'type': req['facet_type'],
                'description': req['description'],
                'value': req['value'],
                'status': req['status'],
                'passed_entities': len(req['passed_entities']),
                'failed_entities': []
            }
            
            # Process failed entities
            for entity in req['failed_entities']:
                if isinstance(entity, dict):
                    requirement['failed_entities'].append({
                        'id': entity.get('id', 'Unknown'),
                        'type': entity.get('type', 'Unknown'),
                        'global_id': entity.get('global_id', 'Unknown'),
                        'reason': entity.get('reason', 'Unknown reason')
                    })
            
            total_checks += req['total_applicable']
            passed_checks += req['total_pass']
            failed_checks += req['total_fail']
            
            processed_spec['requirements'].append(requirement)
        
        processed_specs.append(processed_spec)
    
    # Combine results
    result_json = {
        'schema': ifc.schema,
        'html_report': detailed_report,  # Use our enhanced HTML report
        'basic_stats': stats,
        'validation_summary': {
            'total_specs': validation_results['total_specifications'],
            'total_checks': validation_results['total_checks'],
            'total_passed': validation_results['total_checks_pass'],
            'total_failed': validation_results['total_checks_fail'],
            'pass_rate': validation_results['percent_checks_pass']
        },
        'specifications': processed_specs,
        'validation_status': 'complete',
        'timestamp': datetime.now().isoformat(),
        'log': logger.handlers[0].stream.getvalue(),
        'open_in_tab': True  # Flag to indicate the report should open in new tab
    }
        
except Exception as e:
    logger.error(f"Error during validation: {str(e)}")
    result_json = {
        'error': str(e),
        'log': logger.handlers[0].stream.getvalue()
    }

logger.info("Validation complete")
json.dumps(result_json, cls=IdsEncoder)
`)

        // Parse and validate the result
        if (!result) {
            throw new Error('No result returned from Python code')
        }

        try {
            // Parse the JSON result
            const parsedResult = JSON.parse(result)
            console.debug('Validation results:', parsedResult)

            // Send the parsed result back to the main thread
            self.postMessage({
                success: true,
                result: parsedResult,
                debug: {
                    resultType: typeof result,
                    resultLength: result.length,
                    parsedKeys: Object.keys(parsedResult)
                }
            })
        } catch (error) {
            throw new Error(`Failed to parse Python result: ${error.message}. Raw result: ${result.substring(0, 200)}...`)
        }

    } catch (error) {
        console.error('Worker error:', error)
        self.postMessage({
            success: false,
            error: error.message,
            details: {
                message: error.message,
                stack: error.stack,
                idsContentPresent: !!idsContent,
                idsContentLength: idsContent?.length,
                idsContentStart: idsContent?.substring(0, 100),
                arrayBufferPresent: !!arrayBuffer,
                arrayBufferSize: arrayBuffer?.byteLength
            }
        })
    }
}
