/* global importScripts */
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
  const { arrayBuffer, idsContent, reporterCode, templateContent, fileName } = event.data

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

    // Bypass the Emscripten version compatibility check for wheels.
    self.postMessage({ type: 'progress', message: 'Patching micropip for compatibility check bypass...' })
    await pyodide.runPythonAsync(`
import micropip
from micropip._micropip import WheelInfo
WheelInfo.check_compatible = lambda self: None
    `)

    // Install IfcOpenShell and dependencies
    self.postMessage({ type: 'progress', message: 'Installing IfcOpenShell...' })
    await pyodide.runPythonAsync(`
import micropip
await micropip.install('https://cdn.jsdelivr.net/gh/IfcOpenShell/wasm-wheels@33b437e5fd5425e606f34aff602c42034ff5e6dc/ifcopenshell-0.8.1+latest-cp312-cp312-emscripten_3_1_58_wasm32.whl')
    `)

    self.postMessage({ type: 'progress', message: 'Installing additional dependencies...' })
    await pyodide.runPythonAsync(`
await micropip.install('lark')
await micropip.install('ifctester')
await micropip.install('bcf-client')
await micropip.install('pystache')
    `)

    // NEW: Load sqlite3 package from Pyodide (needed by some dependencies)
    await pyodide.loadPackage('sqlite3')

    // Write the reporter module to the virtual filesystem so that it can be imported.
    self.postMessage({ type: 'progress', message: 'Writing reporter module to FS...' })
    pyodide.FS.writeFile('reporter.py', reporterCode)

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
global report_fileName
report_fileName = '''${fileName || 'Unknown IFC File'}'''
    `)

    // Run the validation in a separate step and call reporter module to generate reports.
    await pyodide.runPythonAsync(`
        import ifcopenshell
        import os
        # Open the IFC model from the virtual file system.
        model = ifcopenshell.open("model.ifc")
        
        # Create and load IDS specification using the official IDS parsing pattern
        from ifctester.ids import Ids, get_schema
        import xml.etree.ElementTree as ET
        if os.path.exists("spec.ids"):
            try:
                # 1. Read the IDS XML content.
                with open("spec.ids", "r") as f:
                    ids_content = f.read()
                # 2. Build an ElementTree from the XML.
                tree = ET.ElementTree(ET.fromstring(ids_content))
                # 3. Decode the XML into a dictionary using the IDS schema.
                decoded = get_schema().decode(
                    tree,
                    strip_namespaces=True,
                    namespaces={"": "http://standards.buildingsmart.org/IDS"}
                )
                # If "@ifcVersion" is missing, add a default list of supported versions.
                if "@ifcVersion" not in decoded:
                    decoded["@ifcVersion"] = ["IFC2X3", "IFC4", "IFC4X3_ADD2"]
                # 4. Create an Ids instance and fully parse the decoded IDS.
                ids = Ids().parse(decoded)
                # 5. Validate specifications against the model.
                ids.validate(model)
            except Exception as e:
                print(f"IDS Parsing Error: {str(e)}")
                # Fallback to empty specs on error
                ids = Ids()
                ids.specifications = []
                ids.validate(model)
        else:
            # Validate model without specifications
            ids = Ids()
            ids.specifications = []
            ids.validate(model)
        
        # Generate the JSON report using the reporter module.
        import reporter
        json_reporter = reporter.Json(ids)
        json_reporter.report()
        
        # NEW: Generate the BCF report
        bcf_reporter = reporter.Bcf(ids)
        bcf_reporter.report()
        temp_bcf_filename = "/report.bcf"
        bcf_reporter.write(temp_bcf_filename)
        with open(temp_bcf_filename, "rb") as f:
             bcf_bytes = f.read()
        import base64
        bcf_b64 = base64.b64encode(bcf_bytes).decode('utf-8')
        
        # Overwrite report title and add bcf data to the JSON report.
        json_reporter.results['filename'] = report_fileName
        json_reporter.results['title'] = report_fileName
        json_reporter.results['bcf_data'] = {"zip_content": bcf_b64, "filename": report_fileName + ".bcf"}
        
        # Export the JSON string.
        import json
        validation_result_json = json.dumps(json_reporter.results, default=str)
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
