importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js')

let pyodide = null

async function loadPyodide() {
  if (pyodide !== null) {
    return pyodide
  }

  try {
    self.postMessage({ type: 'progress', message: 'Loading Pyodide...' })
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
    })

    self.postMessage({ type: 'progress', message: 'Pyodide loaded successfully' })
    return pyodide
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: `Failed to load Pyodide: ${error.message}`,
    })
    throw error
  }
}

self.onmessage = async (event) => {
  const { type, arrayBuffer, idsContent, reporterCode, templateContent, fileName, result } = event.data

  try {
    // Ensure pyodide is loaded
    pyodide = await loadPyodide()
    if (!pyodide) {
      throw new Error('Failed to initialize Pyodide')
    }

    if (!reporterCode) {
      throw new Error('Reporter code is required but was not provided')
    }

    // Import required packages
    self.postMessage({ type: 'progress', message: 'Installing required packages...' })
    await pyodide.loadPackage(['micropip'])

    // Install IfcOpenShell and dependencies
    self.postMessage({ type: 'progress', message: 'Installing IfcOpenShell...' })
    await pyodide.runPythonAsync(`
import micropip
await micropip.install('https://ifcopenshell.github.io/wasm-preview/IfcOpenShell-0.7.0-py3-none-any.whl')
        `)

    self.postMessage({ type: 'progress', message: 'Installing additional dependencies...' })
    await pyodide.runPythonAsync(`
await micropip.install('lark')
await micropip.install('ifctester')
        `)

    // Create virtual files for IFC and IDS data
    self.postMessage({ type: 'progress', message: 'Processing input files...' })
    const uint8Array = new Uint8Array(arrayBuffer)
    pyodide.FS.writeFile('model.ifc', uint8Array)

    if (idsContent) {
      pyodide.FS.writeFile('spec.ids', idsContent)
    }

    // Run the validation
    self.postMessage({ type: 'progress', message: 'Running validation...' })

    // A global namespace for our variables
    pyodide.runPython(`
global validation_result_json
validation_result_json = None
global template_content
template_content = '''${templateContent || ''}'''
        `)

    // Run the validation in a separate step
    pyodide.runPython(`
import sys
sys.path.append('.')

import os
import json
import ifcopenshell
import ifctester
from ifctester.reporter import Json, Html, Bcf
from ifctester.ids import open as open_ids
from datetime import datetime

# Helper function to convert validation results to serializable format
def convert_to_serializable(obj):
    if isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    elif isinstance(obj, (list, tuple)):
        return [convert_to_serializable(item) for item in obj]
    elif isinstance(obj, dict):
        return {str(k): convert_to_serializable(v) for k, v in obj.items()}
    elif hasattr(obj, '__dict__'):
        return convert_to_serializable(obj.__dict__)
    else:
        return str(obj)

# Store results in a global JSON string
def store_results_as_json(results, html_report=None):
    global validation_result_json
    serializable_results = convert_to_serializable(results)
    if html_report:
        serializable_results['html_report'] = html_report
    validation_result_json = json.dumps(serializable_results)

# Custom implementation of get_pset for WASM compatibility
def get_pset(element, pset_name):
    if not element:
        return None
    
    # Try direct property sets first
    try:
        if hasattr(element, "HasPropertySets"):
            for rel in element.HasPropertySets:
                if rel.is_a("IfcPropertySet") and rel.Name == pset_name:
                    return rel
    except:
        pass
    
    # Try to get through relationships
    try:
        for rel in element.IsDefinedBy:
            if rel.is_a("IfcRelDefinesByProperties"):
                if rel.RelatingPropertyDefinition.is_a("IfcPropertySet"):
                    if rel.RelatingPropertyDefinition.Name == pset_name:
                        return rel.RelatingPropertyDefinition
    except:
        pass
    
    return None

# Monkey patch get_pset into ifcopenshell.util.element
if not hasattr(ifcopenshell.util, "element"):
    ifcopenshell.util.element = type("element", (), {})()
ifcopenshell.util.element.get_pset = get_pset

# Monkey patch to handle schema version in WASM
def get_schema_version(ifc_file):
    try:
        # Try to get schema from header info
        info = ifc_file.wrapped_data.header.file_schema.schema_identifiers
        if info and len(info) > 0:
            return info[0]
    except:
        pass
    
    try:
        # Alternative method: try to get from schema name
        schema = ifc_file.schema
        if schema:
            return schema
    except:
        pass
    
    # or try to find in the file content
    try:
        for entity in ifc_file:
            if entity.is_a("IFCPROJECT"):
                # The schema should be in the format "IFC2X3" or "IFC4"
                schema = entity.wrapped_data.schema.upper()
                if schema.startswith("IFC"):
                    return schema
                break
    except:
        pass
    
    # Final fallback
    return "IFC4"

# Patch the schema check in Specification
def patched_check_ifc_version(self, ifc_file):
    try:
        schema = get_schema_version(ifc_file)
        print(f"Debug - Detected schema version: {schema}")
        self.is_ifc_version = schema in self.ifcVersion
    except Exception as e:
        print(f"Warning - Failed to check schema version: {e}")
        self.is_ifc_version = True  # Assume compatible if we can't check
    return self.is_ifc_version

# Apply the patch
ifctester.ids.Specification.check_ifc_version = patched_check_ifc_version

try:
    model = ifcopenshell.open('model.ifc')

    if '''${idsContent}''':
        print("Debug - Opening IDS file...")
        spec = open_ids('spec.ids')
        print("Debug - Validating model against IDS...")
        spec.validate(model)
        
        # Generate JSON report
        json_reporter = Json(spec)
        json_result = json_reporter.report()
        
        # Generate BCF report
        bcf_reporter = Bcf(spec)
        bcf_result = bcf_reporter.report()
        
        # Calculate total checks and passed checks
        total_checks = 0
        total_checks_pass = 0
        
        # Process specifications to add additional stats
        for spec in json_result['specifications']:
            spec_checks = 0
            spec_checks_pass = 0
            spec_total_applicable = 0
            spec_total_applicable_pass = 0
            
            for req in spec['requirements']:
                # Add entity details for passed and failed
                if not 'passed_entities' in req:
                    req['passed_entities'] = []
                if not 'failed_entities' in req:
                    req['failed_entities'] = []
                
                # Count checks
                total_applicable = len(req.get('entities', []))
                total_pass = len([e for e in req.get('entities', []) if e.get('status', False)])
                
                spec_checks += 1
                if req['status']:
                    spec_checks_pass += 1
                
                spec_total_applicable += total_applicable
                spec_total_applicable_pass += total_pass
                
                # Add counts to requirement
                req['total_pass'] = total_pass
                req['total_fail'] = total_applicable - total_pass
                
                # Entity processing for tables
                for entity in req.get('entities', []):
                    entity_data = {
                        'class': entity.get('class', ''),
                        'predefined_type': entity.get('predefined_type', ''),
                        'name': entity.get('name', ''),
                        'description': entity.get('description', ''),
                        'global_id': entity.get('global_id', ''),
                        'tag': entity.get('tag', ''),
                        'reason': entity.get('reason', '')
                    }
                    if entity.get('status', False):
                        req['passed_entities'].append(entity_data)
                    else:
                        req['failed_entities'].append(entity_data)
            
            # Add specification level stats
            spec['total_checks'] = spec_checks
            spec['total_checks_pass'] = spec_checks_pass
            spec['percent_checks_pass'] = round((spec_checks_pass / spec_checks * 100) if spec_checks > 0 else 0, 2)
            spec['total_applicable'] = spec_total_applicable
            spec['total_applicable_pass'] = spec_total_applicable_pass
            
            total_checks += spec_checks
            total_checks_pass += spec_checks_pass
        
        # Create the final result with all required fields
        result = {
            'title': 'IFC Validation Report',
            'date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'filename': '${fileName}',
            'total_specifications': len(json_result['specifications']),
            'total_specifications_pass': len([s for s in json_result['specifications'] if s['status']]),
            'total_requirements': sum(len(s['requirements']) for s in json_result['specifications']),
            'total_requirements_pass': sum(len([r for r in s['requirements'] if r['status']]) 
                                        for s in json_result['specifications']),
            'total_checks': total_checks,
            'total_checks_pass': total_checks_pass,
            'percent_checks_pass': round((total_checks_pass / total_checks * 100) if total_checks > 0 else 0, 2),
            'specifications': json_result['specifications'],
            'status': all(s['status'] for s in json_result['specifications']),
            'bcf_data': bcf_result  # Add BCF data to results
        }

        # Store the result
        store_results_as_json(result)
    else:
        print("Debug - No IDS content provided")
        # Create a basic IDS for model info
        spec = ifctester.ids.Ids()
        reporter = Json(spec)
        raw_result = reporter.report_model_info(model)
        # Store results without HTML report
        store_results_as_json(raw_result)

except Exception as e:
    print(f"Error during validation: {str(e)}")
    raise e
        `)

    // Get the JSON string from Python's global namespace
    const resultJson = pyodide.globals.get('validation_result_json')

    // Parse the JSON string into a JavaScript object
    const results = JSON.parse(resultJson)

    self.postMessage({
      type: 'complete',
      results: results,
    })
  } catch (error) {
    console.error('Worker error:', error)
    self.postMessage({
      type: 'error',
      message: error.message || 'Unknown error occurred',
    })
  }
}
