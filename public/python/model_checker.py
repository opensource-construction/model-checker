#!/usr/bin/env python3

import sys
import subprocess
import pkg_resources
import os
import re
import argparse

# Dictionary of translations (we'll keep a small set here for demo purposes)
TRANSLATIONS = {
    "en": {
        "summary": "Summary",
        "specifications": "Specifications",
        "requirements": "Requirements",
        "details": "Details",
        "class": "Class",
        "predefinedType": "PredefinedType",
        "name": "Name",
        "description": "Description",
        "warning": "Warning",
        "globalId": "GlobalId",
        "tag": "Tag",
        "status": {
            "pass": "PASS",
            "fail": "FAIL",
            "untested": "UNTESTED",
            "skipped": "SKIPPED"
        }
    },
    "de": {
        "summary": "Zusammenfassung",
        "specifications": "Spezifikationen",
        "requirements": "Anforderungen",
        "details": "Details",
        "class": "Klasse",
        "predefinedType": "Vordefinierter Typ",
        "name": "Name",
        "description": "Beschreibung",
        "warning": "Warnung",
        "globalId": "Globale ID",
        "tag": "Kennzeichnung",
        "status": {
            "pass": "BESTANDEN",
            "fail": "FEHLGESCHLAGEN",
            "untested": "UNGETESTET",
            "skipped": "ÜBERSPRUNGEN"
        }
    }
}

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

def translate_html_report(html_content, lang):
    """
    Translate key phrases in the HTML report based on the language.
    
    Args:
        html_content: HTML content to translate
        lang: Language code (e.g., 'en', 'de')
        
    Returns:
        Translated HTML content
    """
    if lang == "en" or lang not in TRANSLATIONS:
        print(f"No translation needed for language: {lang}")
        return html_content
    
    print(f"Translating HTML report to {lang}")
    translations = TRANSLATIONS[lang]
    
    # Simple translation of key phrases
    translatable_terms = [
        ("Summary", "summary"),
        ("Specifications", "specifications"),
        ("Requirements", "requirements"),
        ("Details", "details"),
        ("Class", "class"),
        ("PredefinedType", "predefinedType"),
        ("Name", "name"),
        ("Description", "description"),
        ("Warning", "warning"),
        ("GlobalId", "globalId"),
        ("Tag", "tag"),
        ("PASS", "status.pass"),
        ("FAIL", "status.fail"),
        ("UNTESTED", "status.untested"),
        ("SKIPPED", "status.skipped")
    ]
    
    # Apply translations
    for english_term, field_path in translatable_terms:
        # Handle nested fields like status.pass
        field_parts = field_path.split('.')
        if len(field_parts) > 1:
            translation = translations[field_parts[0]][field_parts[1]]
        else:
            translation = translations[field_path]
        
        # Use regex with word boundaries to avoid partial replacements
        html_content = re.sub(r'\b' + english_term + r'\b', translation, html_content)
    
    print(f"HTML report translation to {lang} completed")
    return html_content

def test_ifc(ifc_path: str, ids_path: str, report_path: str = "report.html", lang: str = "en"):
    """
    Test an IFC file against an IDS specification and generate reports in multiple formats.
    
    Args:
        ifc_path: Path to the IFC file
        ids_path: Path to the IDS specification file
        report_path: Path where to save the HTML report (default: report.html)
        lang: Language for the report (default: en) - Note: Language selection is implemented via post-processing
    
    Returns:
        Dictionary with validation status and paths to generated reports
    """
    print(f"Using language: {lang}")
    
    # Normalize language code (e.g., 'DE' -> 'de', 'de-de' -> 'de')
    lang = lang.lower().split('-')[0]
    
    # Check if language is supported
    if lang not in TRANSLATIONS:
        print(f"Warning: Language '{lang}' not supported, falling back to English")
        lang = "en"
    else:
        print(f"Language '{lang}' is supported")
    
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
        
        # Generate results in multiple formats
        results = {}
        
        # HTML Report
        print("Generating HTML report...")
        html_reporter = reporter.Html(ids_spec)
        html_reporter.report()
        html_reporter.to_file(report_path)
        
        # Apply translations to HTML
        if lang != "en" and lang in TRANSLATIONS:
            print(f"Translating report to {lang}...")
            with open(report_path, "r", encoding="utf-8") as f:
                html_content = f.read()
            
            translated_html = translate_html_report(html_content, lang)
            
            with open(report_path, "w", encoding="utf-8") as f:
                f.write(translated_html)
        
        results["html_path"] = os.path.abspath(report_path)
        
        # JSON Report
        json_path = report_path.replace('.html', '.json')
        print("Generating JSON report...")
        json_reporter = reporter.Json(ids_spec)
        json_reporter.report()
        json_reporter.write(json_path)
        results["json_path"] = os.path.abspath(json_path)
        
        # BCF Report
        bcf_path = report_path.replace('.html', '.bcf')
        print("Generating BCF report...")
        bcf_reporter = reporter.Bcf(ids_spec)
        bcf_reporter.report()
        bcf_reporter.to_file(bcf_path)
        results["bcf_path"] = os.path.abspath(bcf_path)
        
        # Return validation status and report paths
        validation_status = "success" if not any(spec.failed_entities for spec in ids_spec.specifications) else "failed"
        return {
            "status": validation_status,
            "reports": results
        }
    except Exception as e:
        print(f"Error during IFC testing: {str(e)}")
        raise

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description="IFC Model Checker - Validate IFC files against IDS specifications")
    parser.add_argument("--ifc", "-i", help="Path to the IFC file")
    parser.add_argument("--ids", "-s", help="Path to the IDS specification file")
    parser.add_argument("--report", "-r", default="report.html", help="Path for the HTML report (default: report.html)")
    parser.add_argument("--lang", "-l", default="en", choices=list(TRANSLATIONS.keys()), 
                        help="Language for the report (default: en)")
    parser.add_argument("--interactive", "-int", action="store_true", help="Run in interactive mode")
    args = parser.parse_args()
    
    # If interactive mode or no required args, prompt for input
    if args.interactive or not (args.ifc and args.ids):
        if not args.ifc:
            args.ifc = input("Enter path to IFC file: ")
        if not args.ids:
            args.ids = input("Enter path to IDS file: ")
        if not args.report:
            args.report = input("Enter path for report (default: report.html): ") or "report.html"
        if not args.lang:
            args.lang = input(f"Enter language code (default: en, available: {', '.join(TRANSLATIONS.keys())}): ") or "en"
    
    # Run the validation
    try:
        result = test_ifc(args.ifc, args.ids, args.report, args.lang)
        print(f"\nValidation {result['status']}!")
        print(f"Generated reports:")
        for report_type, path in result['reports'].items():
            print(f"- {report_type}: {path}")
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 