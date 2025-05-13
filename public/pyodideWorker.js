/* global importScripts */
importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js')

// We'll load translations from language files instead of hardcoding them
let translations = {}
let consoleTranslations = {}

// Basic initial translations for when the translation system isn't loaded yet
const INITIAL_TRANSLATIONS = {
  en: {
    loadingTranslations: 'Loading translations...',
  },
  de: {
    loadingTranslations: 'Übersetzungen werden geladen...',
  },
  fr: {
    loadingTranslations: 'Chargement des traductions...',
  },
  it: {
    loadingTranslations: 'Caricamento delle traduzioni...',
  },
  rm: {
    loadingTranslations: 'Chargiar translaziuns...',
  },
}

let pyodide = null

// Function to load translations from JSON files
async function loadTranslations(lang) {
  try {
    // Fetch the translation file for the given language
    const response = await fetch(`./locales/${lang}/translation.json`)
    if (!response.ok) {
      console.error(`Failed to load translations for ${lang}:`, response.statusText)
      // If loading fails, try loading English as fallback
      if (lang !== 'en') {
        return loadTranslations('en')
      }
      return {}
    }

    const translationData = await response.json()

    // Save console translations separately for easier access
    if (translationData.console) {
      consoleTranslations = translationData
    }

    // If there's a report section, use it for our translations
    if (translationData.report) {
      return translationData.report
    }

    // If for some reason the report section doesn't exist, return empty object
    console.error(`No report section found in ${lang} translations`)
    return {}
  } catch (error) {
    console.error(`Error loading translations for ${lang}:`, error)
    // If there's an error and we're not already trying English, fall back to English
    if (lang !== 'en') {
      return loadTranslations('en')
    }
    return {}
  }
}

// Helper function to get a translated console message
function getConsoleMessage(key, defaultMessage, params = {}) {
  try {
    // If we don't have any translations, return the default message
    if (!consoleTranslations) {
      return defaultMessage
    }

    // For keys that don't start with 'console.', add the prefix
    if (!key.startsWith('console.')) {
      key = 'console.' + key
    }

    // Split the key by dots to navigate nested objects
    const keys = key.split('.')
    let message = consoleTranslations

    // Navigate through the keys
    for (const k of keys) {
      if (message && message[k]) {
        message = message[k]
      } else {
        // If we can't find the key, return the default message
        return defaultMessage
      }
    }

    // If we found a string, use it; otherwise use the default
    if (typeof message === 'string') {
      // Replace any parameters in the message
      let translatedMessage = message
      for (const [key, value] of Object.entries(params)) {
        translatedMessage = translatedMessage.replace(`{{${key}}}`, value)
      }
      return translatedMessage
    }

    return defaultMessage
  } catch (error) {
    console.error('Error getting console message:', error)
    return defaultMessage
  }
}

// Error type constants for specific handling
const ERROR_TYPES = {
  OUT_OF_MEMORY: 'out_of_memory',
}

// Helper function to detect specific error types
function detectErrorType(error) {
  const errorStr = error.toString().toLowerCase()

  if (errorStr.includes('out of memory') || errorStr.includes('internalerror: out of memory')) {
    return ERROR_TYPES.OUT_OF_MEMORY
  }

  return null
}

async function loadPyodide() {
  if (pyodide !== null) {
    return pyodide
  }

  try {
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.pyodide', 'Loading Pyodide...'),
    })

    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
    })

    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.pyodideSuccess', 'Pyodide loaded successfully'),
    })

    return pyodide
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: getConsoleMessage('console.error.pyodideLoad', `Failed to load Pyodide: ${error.message}`, {
        message: error.message,
      }),
    })
    throw error
  }
}

// Apply translations to the HTML report
function applyTranslations(html, translations, language) {
  if (!translations || language === 'en') {
    return html
  }

  let translatedHtml = html;

  // Simple translation of key terms and phrases using patterns from the translation file
  if (translations.ids && translations.ids.pattern) {
    // Apply pattern-based translations using the templated strings in translation files
    const patterns = translations.ids.pattern;

    // Replace name pattern
    if (patterns.nameShallBe) {
      translatedHtml = translatedHtml.replace(/The Name shall be (.*)/g,
        (match, value) => patterns.nameShallBe.replace('{{value}}', value));
    }

    // Replace description pattern
    if (patterns.descriptionRequired) {
      translatedHtml = translatedHtml.replace(/The Description shall be provided/g,
        patterns.descriptionRequired);
    }

    // Replace property required pattern
    if (patterns.propertyRequired) {
      translatedHtml = translatedHtml.replace(/(\w+) shall be provided in the dataset (\w+)/g,
        (match, property, propertySet) => patterns.propertyRequired
          .replace('{{property}}', property)
          .replace('{{propertySet}}', propertySet));
    }

    // Replace property value pattern
    if (patterns.propertyValue) {
      translatedHtml = translatedHtml.replace(/(\w+) shall be (.*?) in the dataset (\w+)/g,
        (match, property, value, propertySet) => patterns.propertyValue
          .replace('{{property}}', property)
          .replace('{{value}}', value)
          .replace('{{propertySet}}', propertySet));
    }

    // Replace enumeration pattern
    if (patterns.enumRequired) {
      translatedHtml = translatedHtml.replace(/One of the enumeration values \[(.*?)\] shall be provided in the dataset (\w+)/g,
        (match, values, propertySet) => patterns.enumRequired
          .replace('{{values}}', values)
          .replace('{{propertySet}}', propertySet));
    }
  }

  // Basic term replacements
  const basicTerms = [
    { en: 'Summary', field: 'summary' },
    { en: 'Specifications', field: 'specifications' },
    { en: 'Requirements', field: 'requirements' },
    { en: 'Details', field: 'details' },
    { en: 'Class', field: 'class' },
    { en: 'PredefinedType', field: 'predefinedType' },
    { en: 'Name', field: 'name' },
    { en: 'Description', field: 'description' },
    { en: 'Warning', field: 'warning' },
    { en: 'GlobalId', field: 'globalId' },
    { en: 'Tag', field: 'tag' },
    { en: 'Report by', field: 'reportBy' },
    { en: 'and', field: 'and' },
    { en: 'PASS', field: 'status.pass' },
    { en: 'FAIL', field: 'status.fail' },
    { en: 'UNTESTED', field: 'status.untested' },
    { en: 'SKIPPED', field: 'status.skipped' }
  ];

  basicTerms.forEach(term => {
    const fieldPath = term.field.split('.');
    let translation;

    if (fieldPath.length > 1) {
      if (translations[fieldPath[0]] && translations[fieldPath[0]][fieldPath[1]]) {
        translation = translations[fieldPath[0]][fieldPath[1]];
      }
    } else {
      translation = translations[term.field];
    }

    if (translation) {
      const regex = new RegExp(`\\b${term.en}\\b`, 'g');
      translatedHtml = translatedHtml.replace(regex, translation);
    }
  });

  // Interface element translations
  if (translations.interface) {
    // Replace passed/failed
    if (translations.interface.passed) {
      translatedHtml = translatedHtml.replace(/\bpassed\b/g, translations.interface.passed);
    }
    if (translations.interface.failed) {
      translatedHtml = translatedHtml.replace(/\bfailed\b/g, translations.interface.failed);
    }

    // Replace prefix phrases
    [
      { prefix: 'Checks passed', field: 'checksPassedPrefix' },
      { prefix: 'Specifications passed', field: 'specificationsPassedPrefix' },
      { prefix: 'Requirements passed', field: 'requirementsPassedPrefix' },
      { prefix: 'Elements passed', field: 'elementsPassedPrefix' },
      { prefix: 'Applicability', field: 'applicability' },
      { prefix: 'All', field: 'all' },
    ].forEach(term => {
      if (translations.interface[term.field]) {
        const regex = new RegExp(`\\b${term.prefix}\\b`, 'g');
        translatedHtml = translatedHtml.replace(regex, translations.interface[term.field]);
      }
    });

    // Handle "All X data" patterns
    if (translations.interface.all && translations.interface.data) {
      const regex = new RegExp(`All ([\\w]+) data`, 'g');
      translatedHtml = translatedHtml.replace(regex, (match, type) => {
        return `${translations.interface.all} ${type} ${translations.interface.data}`;
      });
    }
  }

  // Error message translations
  if (translations.errorMessages) {
    Object.entries(translations.errorMessages).forEach(([key, translation]) => {
      if (translation) {
        // Match based on the English error messages
        let pattern;
        switch (key) {
          case 'propertySetNotExist':
            pattern = 'The required property set does not exist';
            break;
          case 'dataShallBeProvided':
            pattern = 'data shall be provided in the dataset';
            break;
          case 'propertyNotExist':
            pattern = 'The required property does not exist';
            break;
          case 'invalidValue':
            pattern = 'has an invalid value';
            break;
          case 'notInRange':
            pattern = 'is not in the allowed range';
            break;
          case 'notFound':
            pattern = 'was not found';
            break;
          case 'doesNotHave':
            pattern = 'does not have';
            break;
          case 'missingProperty':
            pattern = 'is missing the required property';
            break;
        }

        if (pattern) {
          translatedHtml = translatedHtml.replace(new RegExp(pattern, 'g'), translation);
        }
      }
    });
  }

  // Handle complex phrases with placeholders
  if (translations.phrases) {
    // More of same type message
    if (translations.phrases.moreOfSameType) {
      const regex = /\.\.\. (\d+) more of the same element type \((.*?) with Tag (.*?) and GlobalId (.*?)\) not shown \.\.\./g;
      translatedHtml = translatedHtml.replace(regex, (match, count, type, tag, id) => {
        return translations.phrases.moreOfSameType
          .replace('{{count}}', count)
          .replace('{{type}}', type)
          .replace('{{tag}}', tag)
          .replace('{{id}}', id);
      });
    }

    // More elements not shown message
    if (translations.phrases.moreElementsNotShown) {
      const regex = /\.\.\. (\d+) more (.*?) elements not shown out of (\d+) total \.\.\./g;
      translatedHtml = translatedHtml.replace(regex, (match, count, type, total) => {
        return translations.phrases.moreElementsNotShown
          .replace('{{count}}', count)
          .replace('{{type}}', type)
          .replace('{{total}}', total);
      });
    }
  }

  // Handle section title translations for IDS
  if (translations.ids && translations.ids.section) {
    Object.entries(translations.ids.section).forEach(([key, translation]) => {
      // Match based on English section titles
      let pattern;
      switch (key) {
        case 'loadBearing':
          pattern = 'Load Bearing';
          break;
        // Add more sections as needed
      }

      if (pattern && translation) {
        const regex = new RegExp(`\\b${pattern}\\b`, 'g');
        translatedHtml = translatedHtml.replace(regex, translation);
      }
    });
  }

  // Handle description translations for IDS
  if (translations.ids && translations.ids.description) {
    Object.entries(translations.ids.description).forEach(([key, translation]) => {
      // Match based on English descriptions
      let pattern;
      switch (key) {
        case 'shouldHaveLoadBearing':
          pattern = 'All Structure Elements should have a load bearing';
          break;
        // Add more descriptions as needed  
      }

      if (pattern && translation) {
        const regex = new RegExp(pattern, 'g');
        translatedHtml = translatedHtml.replace(regex, translation);
      }
    });
  }

  return translatedHtml;
}

self.onmessage = async (event) => {
  const { arrayBuffer, idsContent, fileName, language = 'en' } = event.data

  console.log('Worker: Language received:', language)

  // Validate and normalize the language code
  const normalizedLanguage = language.toLowerCase().split('-')[0]
  const supportedLanguages = ['en', 'de', 'fr', 'it', 'rm'] // List of supported languages
  const effectiveLanguage = supportedLanguages.includes(normalizedLanguage) ? normalizedLanguage : 'en'

  console.log('Worker: Using language:', effectiveLanguage)

  try {
    // Load the translations first
    self.postMessage({
      type: 'progress',
      message: INITIAL_TRANSLATIONS[effectiveLanguage]?.loadingTranslations || 'Loading translations...',
    })

    translations = await loadTranslations(effectiveLanguage)

    // Now we can use translated messages
    // Ensure pyodide is loaded
    pyodide = await loadPyodide()
    if (!pyodide) {
      throw new Error('Failed to initialize Pyodide')
    }

    // Import required packages
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.packages', 'Installing required packages...'),
    })

    await pyodide.loadPackage(['micropip'])

    // Bypass the Emscripten version compatibility check for wheels.
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage(
        'console.loading.micropipPatch',
        'Patching micropip for compatibility check bypass...',
      ),
    })

    await pyodide.runPythonAsync(`
import micropip
from micropip._micropip import WheelInfo
WheelInfo.check_compatible = lambda self: None
    `)

    // Install IfcOpenShell and dependencies
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.ifcOpenShell', 'Installing IfcOpenShell...'),
    })

    await pyodide.runPythonAsync(`
import micropip
await micropip.install('https://cdn.jsdelivr.net/gh/IfcOpenShell/wasm-wheels@33b437e5fd5425e606f34aff602c42034ff5e6dc/ifcopenshell-0.8.1+latest-cp312-cp312-emscripten_3_1_58_wasm32.whl')
    `)

    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.dependencies', 'Installing additional dependencies...'),
    })

    await pyodide.runPythonAsync(`
import micropip
print("Attempting to install ifctester 0.8.1, bcf-client 0.8.1 and dependencies...")
await micropip.install(['lark', 'ifctester==0.8.1', 'bcf-client==0.8.1', 'pystache'], keep_going=True)
print("Finished attempting to install ifctester 0.8.1, bcf-client 0.8.1 and dependencies.")
    `)

    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.inputFiles', 'Processing input files...'),
    })

    // Run validation
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.validation', 'Running IFC validation...'),
    })

    // Load sqlite3 package from Pyodide (needed by some dependencies)
    await pyodide.loadPackage('sqlite3')

    // Create virtual files for IFC and IDS data
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.inputFiles', 'Processing input files...'),
    })
    const uint8Array = new Uint8Array(arrayBuffer)
    pyodide.FS.writeFile('model.ifc', uint8Array)

    if (idsContent) {
      pyodide.FS.writeFile('spec.ids', idsContent)
    }

    // Run the validation and generate reports directly using ifctester
    self.postMessage({
      type: 'progress',
      message: getConsoleMessage('console.loading.validation', 'Running IFC validation...'),
    })
    await pyodide.runPythonAsync(`
import ifcopenshell
import os
import json
import base64
import re
from datetime import datetime

# Open the IFC model from the virtual file system
model = ifcopenshell.open("model.ifc")

# Create and load IDS specification
from ifctester.ids import Ids, get_schema
import xml.etree.ElementTree as ET

# Register XML namespaces for correct parsing
ET.register_namespace('xs', 'http://www.w3.org/2001/XMLSchema')
ET.register_namespace('', 'http://standards.buildingsmart.org/IDS')

if os.path.exists("spec.ids"):
    try:
        # 1. Read the IDS XML content
        with open("spec.ids", "r") as f:
            ids_content = f.read()
        
        # 2. Build an ElementTree from the XML
        tree = ET.ElementTree(ET.fromstring(ids_content))
        
        # 3. Decode the XML using the IDS schema with proper namespace handling
        decoded = get_schema().decode(
            tree,
            strip_namespaces=True,
            namespaces={
                "": "http://standards.buildingsmart.org/IDS",
                "xs": "http://www.w3.org/2001/XMLSchema"
            }
        )
        
        # If "@ifcVersion" is missing, add a default list of supported versions
        if "@ifcVersion" not in decoded:
            decoded["@ifcVersion"] = ["IFC2X3", "IFC4", "IFC4X3_ADD2"]
            
        # 3.5 Process schema values for proper type conversion and format simplification
        def process_schema_values(obj):
            """
            Recursively process schema values for compatibility with Pyodide:
            1. Convert string numeric values to actual numeric types
            2. Transform complex XML schema structures into simpler formats
            3. Flatten nested restriction types into a format that ifctester can handle
            """
            if isinstance(obj, dict):
                # Handle special case of XSD restriction type
                if 'xs:restriction' in obj:
                    restriction = obj['xs:restriction']
                    base_type = restriction.get('@base', '')
                    result = {}
                    
                    # Process numeric restrictions (decimal, double, float)
                    if base_type in ('xs:decimal', 'xs:double', 'xs:float'):
                        # Extract min/max values
                        if 'xs:minInclusive' in restriction:
                            min_value = restriction['xs:minInclusive'].get('@value')
                            if min_value is not None:
                                result['min'] = float(min_value)
                        
                        if 'xs:maxInclusive' in restriction:
                            max_value = restriction['xs:maxInclusive'].get('@value')
                            if max_value is not None:
                                result['max'] = float(max_value)
                        
                        # Return simplified restriction
                        return result
                
                # Process standard numeric attributes
                numeric_attrs = ['@min', '@max', '@minInclusive', '@maxInclusive', 
                                '@minExclusive', '@maxExclusive', '@value']
                for attr in numeric_attrs:
                    if attr in obj and obj[attr] is not None:
                        try:
                            if isinstance(obj[attr], str) and (obj[attr].replace('.', '', 1).isdigit() or 
                                                              (obj[attr].startswith('-') and obj[attr][1:].replace('.', '', 1).isdigit())):
                                obj[attr] = float(obj[attr])
                        except (ValueError, TypeError):
                            pass
                
                # Process nested structures
                for key, value in list(obj.items()):
                    if isinstance(value, (dict, list)):
                        obj[key] = process_schema_values(value)
            
            elif isinstance(obj, list):
                return [process_schema_values(item) for item in obj]
            
            return obj
        
        # Apply schema processing
        decoded = process_schema_values(decoded)
        
        # 4. Create an Ids instance and parse the decoded IDS
        ids = Ids().parse(decoded)
        
        # 5. Validate specifications against the model
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

# Generate reports using ifctester's built-in reporter classes
from ifctester import reporter

# Patch the reporter classes to handle complex value structures
def patch_reporters():
    """
    Apply runtime patches to ifctester reporter classes to handle 
    complex value structures in the browser environment
    """
    # Save the original to_ids_value method
    original_to_ids_value = reporter.Facet.to_ids_value
    
    # Define a patched version that can handle complex structures
    def patched_to_ids_value(self, parameter):
        try:
            # First try the original method
            return original_to_ids_value(self, parameter)
        except Exception as e:
            # If that fails, handle complex structures more gracefully
            if isinstance(parameter, dict):
                # If it's a dictionary with min/max values, convert to a simple range string
                if 'min' in parameter or 'max' in parameter:
                    min_val = parameter.get('min', '*')
                    max_val = parameter.get('max', '*')
                    return f"Range: [{min_val}, {max_val}]"
                
                # Handle other dictionary types
                return str(parameter)
            elif isinstance(parameter, (list, tuple)):
                # Convert lists to comma-separated strings
                return ", ".join(str(x) for x in parameter)
            else:
                # For other types, use string representation
                return str(parameter)
    
    # Apply the patch
    reporter.Facet.to_ids_value = patched_to_ids_value

# Apply reporter patches
patch_reporters()

# Generate HTML report
html_report_path = "report.html"
html_reporter = reporter.Html(ids)
html_reporter.report()
html_reporter.to_file(html_report_path)
with open(html_report_path, "r", encoding="utf-8") as f:
    html_content = f.read()

# Language code passed from JavaScript
language_code = "${effectiveLanguage}"
print(f"Python: Using language code: {language_code}")

# Function to translate HTML content based on language
def translate_html(html_content, language_code):
    # We'll leave translations to the JavaScript side
    # This is a placeholder function as we handle translations in JS
    return html_content
    
    # We'll get translations from JavaScript after we return to the worker

# Generate JSON report
json_reporter = reporter.Json(ids)
json_reporter.report()

# Generate BCF report
bcf_reporter = reporter.Bcf(ids)
bcf_reporter.report()
bcf_path = "report.bcf"
bcf_reporter.to_file(bcf_path)
with open(bcf_path, "rb") as f:
    bcf_bytes = f.read()
bcf_b64 = base64.b64encode(bcf_bytes).decode('utf-8')

# Create final results object
report_file_name = "${fileName}" or "Report_" + datetime.now().strftime("%Y%m%d_%H%M%S")
results = json_reporter.results
results['filename'] = report_file_name
results['title'] = report_file_name
results['bcf_data'] = {"zip_content": bcf_b64, "filename": report_file_name + ".bcf"}
results['html_content'] = html_content
results['language_code'] = language_code

# Add UI language information to results
results['ui_language'] = "${effectiveLanguage}"
results['available_languages'] = ${JSON.stringify(Object.keys(translations))}

# Determine validation status
results['validation_status'] = "success" if not any(spec.failed_entities for spec in ids.specifications) else "failed"

# Export the results as JSON
validation_result_json = json.dumps(results, default=str, ensure_ascii=False)
    `)

    // Get the JSON string from Python's global namespace
    const resultJson = pyodide.globals.get('validation_result_json')

    // Parse the JSON string into a JavaScript object
    const results = JSON.parse(resultJson)

    console.log('Worker: Report language information:', {
      languageProvided: language,
      effectiveLanguage: effectiveLanguage,
      resultsLanguageCode: results.language_code,
      availableLanguages: results.available_languages,
    })

    // Apply translations to the HTML report
    if (results.language_code && results.language_code !== 'en') {
      const lang = results.language_code;

      // Load translations if they're not already loaded
      if (Object.keys(translations).length === 0) {
        translations = await loadTranslations(lang);
      }

      if (translations) {
        // Apply translations using our simplified function
        results.html_content = applyTranslations(results.html_content, translations, lang);
        console.log('Worker: HTML report translated to', lang);
      }
    }

    // Add responsive table styles to prevent overflow
    const tableStyles = `
    <style>
      /* Responsive table styles */
      table {
        width: 100%;
        table-layout: auto;
        border-collapse: collapse;
        margin-bottom: 1em;
        overflow-x: auto;
        display: block;
      }
      
      @media (min-width: 1024px) {
        table {
          display: table;
          overflow-x: visible;
        }
      }
      
      td {
        word-break: break-word;
        max-width: 200px;
        padding: 8px;
      }
      
      th {
        text-align: left;
        padding: 8px;
      }
      
      /* Fix for row colors */
      tr:nth-child(even) {
        background-color: rgba(0,0,0,0.05);
      }
    </style>
    `

    // Insert the styles right after the opening <head> tag
    if (results.html_content) {
      results.html_content = results.html_content.replace('<head>', '<head>' + tableStyles)
    }

    self.postMessage({
      type: 'complete',
      results: results,
      message: getConsoleMessage('console.success.processingComplete', 'Your files have been processed.'),
    })
  } catch (error) {
    console.error('Worker error:', error)

    // Check for specific error types
    const errorType = detectErrorType(error)

    if (errorType === ERROR_TYPES.OUT_OF_MEMORY) {
      self.postMessage({
        type: 'error',
        errorType: ERROR_TYPES.OUT_OF_MEMORY,
        message: getConsoleMessage(
          'console.error.outOfMemory',
          'Pyodide ran out of memory. The page will reload automatically to free resources.',
        ),
        stack: error.stack,
      })
    } else {
      self.postMessage({
        type: 'error',
        message: getConsoleMessage('console.error.generic', `An error occurred: ${error.message}`, {
          message: error.message,
        }),
        stack: error.stack,
      })
    }
  }
}
