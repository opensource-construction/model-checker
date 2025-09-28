/* global importScripts */
importScripts('https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.js')

let pyodide = null
let isProcessing = false

const WHEEL_PATH = './wasm/ifcopenshell-0.8.4+b1b95ec-cp313-cp313-emscripten_4_0_9_wasm32.whl'

function normalizeIfc4x3Header(arrayBuffer) {
  try {
    const total = arrayBuffer.byteLength
    const headerLen = Math.min(total, 64 * 1024)
    const headerBytes = new Uint8Array(arrayBuffer, 0, headerLen)
    const decoder = new TextDecoder('utf-8', { fatal: false })
    const headerStr = decoder.decode(headerBytes)
    const schemaRe = /FILE_SCHEMA\s*\(\s*\(\s*'IFC4X3(?:_[A-Z0-9]+)?'\s*\)\s*\)/
    if (!schemaRe.test(headerStr)) return new Uint8Array(arrayBuffer)
    const newHeaderStr = headerStr.replace(schemaRe, "FILE_SCHEMA(('IFC4X3_ADD2'))")
    if (newHeaderStr === headerStr) return new Uint8Array(arrayBuffer)
    const newHeaderBytes = new TextEncoder().encode(newHeaderStr)
    const rest = new Uint8Array(arrayBuffer, headerLen)
    const out = new Uint8Array(newHeaderBytes.length + rest.length)
    out.set(newHeaderBytes, 0)
    out.set(rest, newHeaderBytes.length)
    return out
  } catch (err) {
    console.warn('Schema normalization skipped; using original buffer', err)
    return new Uint8Array(arrayBuffer)
  }
}

// Simple console message function
function getConsoleMessage(key, defaultMessage) {
  return defaultMessage
}

// Load Pyodide once
async function initializePyodide() {
  if (pyodide !== null) {
    return pyodide
  }

  try {
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.pyodide', 'Loading Pyodide...'),
    })

    pyodide = await self.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/',
    })

    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.pyodideSuccess', 'Pyodide loaded successfully'),
    })

    return pyodide
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: getConsoleMessage('console.error.pyodideLoad', `Failed to load Pyodide: ${error.message}`),
    })
    throw error
  }
}

const WORKER_VERSION = '3.1.0-clean-bcf'
console.log('pyodideWorkerClean version:', WORKER_VERSION)

self.onmessage = async function (e) {
  if (isProcessing) {
    self.postMessage({
      type: 'error',
      errorType: 'busy',
      message: getConsoleMessage(
        'console.error.busy',
        'Validation is already running. Please wait for the current run to finish.',
      ),
    })
    return
  }
  isProcessing = true

  const { arrayBuffer, idsContent, fileName, language, generateBcf, idsFilename } = e.data

  // Per-run FS isolation
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const runDir = `/${runId}`
  let ifcPath = ''
  let idsPath = ''
  let bcfPath = ''

  try {
    // Load Pyodide
    await initializePyodide()

    // Install required packages
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.packages', 'Installing required packages...'),
    })

    await pyodide.loadPackage(['micropip', 'python-dateutil', 'six', 'numpy', 'setuptools', 'typing-extensions', 'sqlite3', 'shapely'])

    await pyodide.runPythonAsync(`
import micropip

def _allow(_):
    return None

try:
    import micropip._utils as _utils
    _utils.check_compatible = _allow
except Exception:
    pass

try:
    from micropip._micropip import WheelInfo
except ModuleNotFoundError:
    WheelInfo = None

if "WheelInfo" in globals() and WheelInfo is not None:
    WheelInfo.check_compatible = lambda self: None
    `)
    
    // Bypass the Emscripten version compatibility check for wheels
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.micropipPatch', 'Patching micropip for compatibility...'),
    })

    // Install IfcOpenShell and IfcTester
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.ifcOpenShell', 'Installing IfcOpenShell...'),
    })
    
    await pyodide.runPythonAsync(`
import micropip

WHEEL_URL = ${JSON.stringify(new URL(WHEEL_PATH, self.location).toString())}

await micropip.install(WHEEL_URL, deps=False, keep_going=False)

import ifcopenshell
print('IfcOpenShell version:', getattr(ifcopenshell, '__version__', 'unknown'))
    `)

    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.dependencies', 'Installing additional dependencies...'),
    })
    
    await pyodide.runPythonAsync(`
import micropip
await micropip.install(['lark', 'ifctester==0.8.1', 'bcf-client==0.8.1', 'pystache'], keep_going=True)
    `)

    // Write files to Pyodide filesystem
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.inputFiles', 'Processing input files...'),
    })

    // Create per-run directory and write inputs
    try { pyodide.FS.mkdir(runDir) } catch (_) {}
    ifcPath = `${runDir}/input.ifc`
    idsPath = `${runDir}/input.ids`
    bcfPath = `${runDir}/report.bcf`
    const normalizedIfc = normalizeIfc4x3Header(arrayBuffer)
    pyodide.FS.writeFile(ifcPath, normalizedIfc)
    if (idsContent) pyodide.FS.writeFile(idsPath, idsContent)

    // Run validation using native IfcTester
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.validation', 'Running IFC validation...'),
    })

    const wantBcf = !!generateBcf

    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const yy = String(yyyy).slice(-2)
    const ifcBaseName = (fileName || 'report.ifc').toString().split(/[/\\]/).pop()
    const idsBaseName = (idsFilename || 'ids').toString().split(/[/\\]/).pop()
    const combinedName = `${yy}${mm}${dd}-${ifcBaseName}-${idsBaseName}`
    const sanitizedReportBaseName = (combinedName || 'report')
      .replace(/[<>:"/\\|?*]/g, '_')
      .split('')
      .map((char) => (char.charCodeAt(0) < 32 ? '_' : char))
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\.+$/, '') || 'report'
    const safeReportBaseName = JSON.stringify(sanitizedReportBaseName)

    const pythonIfcPath = JSON.stringify(ifcPath)
    const pythonIdsPath = JSON.stringify(idsContent ? idsPath : '')
    const pythonBcfPath = JSON.stringify(bcfPath)
    const pythonFileName = JSON.stringify(fileName ?? '')
    const pythonLanguage = JSON.stringify(language ?? '')

    const validationResult = await pyodide.runPythonAsync(`
import json
import os
import base64
import re
import ifcopenshell
from ifctester import ids, reporter
from datetime import datetime

# Flag for optional BCF generation
generate_bcf = ${wantBcf ? 'True' : 'False'}
report_basename = ${safeReportBaseName}
IFC_PATH = ${pythonIfcPath}
IDS_PATH = ${pythonIdsPath}
BCF_PATH = ${pythonBcfPath}

# Open IFC file
print(f"Opening IFC file: {IFC_PATH}")
ifc = ifcopenshell.open(IFC_PATH)

# Initialize basic results structure
results = {
    "title": "IDS Validation Report",
    "name": "IDS Validation Report",
    "filename": ${pythonFileName},
    "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "language_code": ${pythonLanguage},
    "status": True,
    "validation_status": "success"
}

# Track IDS specification for optional reporting
ids_spec = None

# Check if IDS file exists and validate
if IDS_PATH and os.path.exists(IDS_PATH):
    print(f"Loading IDS specification: {IDS_PATH}")
    ids_spec = ids.open(IDS_PATH)
    
    if ids_spec and ids_spec.specifications:
        print("Validating IFC against IDS...")
        ids_spec.validate(ifc)
        
        # Use IfcTester's native JSON reporter and transform to our frontend structure
        try:
            json_reporter = reporter.Json(ids_spec)
            native_results = json_reporter.report()
            
            # Transform IfcTester's structure to match our frontend expectations
            results.update(native_results)
            results["filename"] = ${pythonFileName}
            results["language_code"] = ${pythonLanguage}
            results["validation_status"] = "success" if results.get("status", False) else "failed"
            
            # Transform specifications to add missing fields our frontend expects
            for spec in results.get("specifications", []):
                # Add fields that our frontend expects but IfcTester doesn't provide
                if "total_applicable" not in spec:
                    spec["total_applicable"] = 0
                if "total_applicable_pass" not in spec:
                    spec["total_applicable_pass"] = 0
                if "total_applicable_fail" not in spec:
                    spec["total_applicable_fail"] = 0
                
                # Transform requirements to add missing fields
                for req in spec.get("requirements", []):
                    # Map IfcTester's structure to our frontend structure
                    if "total_checks" not in req:
                        req["total_checks"] = req.get("total_applicable", 0)
                    if "cardinality" not in req:
                        req["cardinality"] = "required"
                    if "has_omitted_passes" not in req:
                        req["has_omitted_passes"] = False
                    if "has_omitted_failures" not in req:
                        req["has_omitted_failures"] = False
                    
                    # Transform entity data to match our frontend expectations
                    for entity_list in ["passed_entities", "failed_entities"]:
                        if entity_list in req:
                            transformed_entities = []
                            for entity in req[entity_list]:
                                transformed_entity = {
                                    "class": entity.get("class", "Unknown"),
                                    "predefined_type": entity.get("predefined_type") or "None",
                                    "name": entity.get("name") or "None", 
                                    "description": entity.get("description") or "None",
                                    "global_id": entity.get("global_id") or "None",
                                    "tag": entity.get("tag") or "None",
                                    "reason": entity.get("reason", "")
                                }
                                transformed_entities.append(transformed_entity)
                            req[entity_list] = transformed_entities
            
            print("Successfully transformed IfcTester JSON results to frontend format")
                
        except Exception as e:
            print(f"IfcTester JSON reporter error: {e}")
            results["specifications"] = []
            results["status"] = False
            results["validation_status"] = "failed"
else:
    print("No IDS file provided")
    results["specifications"] = []

# Generate BCF report if requested and a valid IDS specification is available
if generate_bcf and ids_spec and getattr(ids_spec, 'specifications', None):
    try:
        bcf_reporter = reporter.Bcf(ids_spec)
        bcf_reporter.report()
        bcf_path = BCF_PATH
        bcf_reporter.to_file(bcf_path)
        with open(bcf_path, 'rb') as bcf_file:
            bcf_bytes = bcf_file.read()
        bcf_b64 = base64.b64encode(bcf_bytes).decode('utf-8')
        results['bcf_data'] = {
            'zip_content': bcf_b64,
            'filename': f"{report_basename}.bcf"
        }
        print('BCF report generated successfully')
    except Exception as bcf_error:
        results['bcf_error'] = f"BCF generation failed: {bcf_error}"

# Calculate top-level totals for applicable entities
results["total_applicable"] = sum(spec.get("total_applicable", 0) for spec in results.get("specifications", []))
results["total_applicable_pass"] = sum(spec.get("total_applicable_pass", 0) for spec in results.get("specifications", []))
results["total_applicable_fail"] = sum(spec.get("total_applicable_fail", 0) for spec in results.get("specifications", []))

# Return JSON string - let frontend handle all translations and enhancements
json.dumps(results, default=str, ensure_ascii=False)
    `)

    // Parse the JSON result
    const results = JSON.parse(validationResult)

    // Check for errors
    if (results.error) {
      throw new Error(results.error)
    }

    // Add metadata for frontend
    results.ui_language = language
    results.available_languages = ['en', 'de', 'fr', 'it', 'rm']
    results.filename = fileName
    results.validation_status = results.status ? 'success' : 'failed'

    // Attach idsFilename for tab title building (if provided)
    if (idsFilename) {
      results.ids_filename = idsFilename
    }

    // Send results back to frontend
    self.postMessage({
      type: 'complete',
      results: results,
      message: getConsoleMessage('console.success.processingComplete', 'Your files have been processed.'),
    })

  } catch (error) {
    console.error('Worker error:', error)

    // Check for out of memory error
    const errorStr = error.toString().toLowerCase()
    if (errorStr.includes('out of memory') || errorStr.includes('internalerror: out of memory')) {
      self.postMessage({
        type: 'error',
        errorType: 'out_of_memory',
        message: getConsoleMessage(
          'console.error.outOfMemory',
          'Pyodide ran out of memory. The page will reload automatically to free resources.',
        ),
        stack: error.stack,
      })
    } else {
      self.postMessage({
        type: 'error',
        message: getConsoleMessage('console.error.generic', `An error occurred: ${error.message}`),
        stack: error.stack,
      })
    }
  } finally {
    // Cleanup per-run files and release lock
    try {
      const exists = (p) => { try { return p && pyodide.FS.analyzePath(p).exists } catch { return false } }
      if (exists(ifcPath)) pyodide.FS.unlink(ifcPath)
      if (exists(idsPath)) pyodide.FS.unlink(idsPath)
      if (exists(bcfPath)) pyodide.FS.unlink(bcfPath)
      try { pyodide.FS.rmdir(runDir) } catch {}
    } catch {}
    isProcessing = false
  }
}
