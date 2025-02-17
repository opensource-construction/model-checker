from __future__ import annotations
import os
import re
import sys
import math
import datetime
import ifcopenshell
import ifcopenshell.util.unit
import ifcopenshell.util.element
from typing import TypedDict, Union, Literal, Optional
from ifctester.ids import Specification, Ids
from ifctester.facet import Facet, FacetFailure
import uuid

# Fallback for __file__ in the Pyodide environment
try:
    __file__
except NameError:
    __file__ = "reporter.py"

# Get current working directory of this file
cwd = os.path.dirname(os.path.realpath(__file__))

# A type alias for percentages (or "N/A")
ResultsPercent = Union[int, Literal["N/A"]]

# Define the overall report results type.
class Results(TypedDict):
    title: str
    date: str
    filepath: str
    filename: str
    specifications: list[ResultsSpecification]
    status: bool
    total_specifications: int
    total_specifications_pass: int
    total_specifications_fail: int
    percent_specifications_pass: ResultsPercent
    total_requirements: int
    total_requirements_pass: int
    total_requirements_fail: int
    percent_requirements_pass: ResultsPercent
    total_checks: int
    total_checks_pass: int
    total_checks_fail: int
    percent_checks_pass: ResultsPercent

# Each specification's results
class ResultsSpecification(TypedDict):
    name: str
    description: str
    instructions: str
    status: bool
    is_ifc_version: bool
    total_applicable: int
    total_applicable_pass: int
    total_applicable_fail: int
    percent_applicable_pass: ResultsPercent
    total_checks: int
    total_checks_pass: int
    total_checks_fail: int
    percent_checks_pass: ResultsPercent
    required: bool
    applicability: list[str]
    requirements: list[ResultsRequirement]

# Each requirement's results as part of a specification.
class ResultsRequirement(TypedDict):
    facet_type: str
    metadata: dict
    label: str
    value: str
    description: str
    status: bool
    passed_entities: list[ResultsEntity]
    failed_entities: list[ResultsEntity]
    total_applicable: int
    total_pass: int
    total_fail: int
    percent_pass: ResultsPercent

# For a given element (or failure), capture its details.
ResultsEntity = TypedDict(
    "ResultsEntity",
    {
        "reason": str,
        "element": ifcopenshell.entity_instance,
        "element_type": Union[ifcopenshell.entity_instance, None],
        "class": str,
        "predefined_type": str,
        "name": Optional[str],
        "description": Optional[str],
        "id": int,
        "global_id": Optional[str],
        "tag": Optional[str],
    },
)

###############################################################################
# Base Reporter
###############################################################################
class Reporter:
    def __init__(self, ids: Ids):
        self.ids = ids

    def report(self, ids=None):
        raise NotImplementedError

    def to_string(self) -> str:
        return ""

    def write(self, filepath: str):
        raise NotImplementedError

###############################################################################
# Console Reporter – prints coloured output to stdout.
###############################################################################
class Console(Reporter):
    def __init__(self, ids: Ids, use_colour: bool = True):
        super().__init__(ids)
        self.use_colour = use_colour
        self.colours = {
            "red": "\033[1;31m",
            "blue": "\033[1;34m",
            "cyan": "\033[1;36m",
            "green": "\033[0;32m",
            "yellow": "\033[0;33m",
            "purple": "\033[0;95m",
            "grey": "\033[0;90m",
            "reset": "\033[0;0m",
            "bold": "\033[;1m",
            "reverse": "\033[;7m",
        }

    def report(self) -> None:
        self.set_style("bold", "blue")
        self.print(self.ids.info.get("title", "Untitled IDS"))
        for specification in self.ids.specifications:
            self.report_specification(specification)
        self.set_style("reset")

    def report_specification(self, specification: Specification) -> None:
        # Print status header.
        if specification.status is True:
            self.set_style("bold", "green")
            self.print("[PASS] ", end="")
        elif specification.status is False:
            self.set_style("bold", "red")
            self.print("[FAIL] ", end="")
        elif specification.status is None:
            self.set_style("bold", "yellow")
            self.print("[UNTESTED] ", end="")

        self.set_style("bold")
        total = len(specification.applicable_entities)
        total_successes = total - len(specification.failed_entities)
        self.print(f"({total_successes}/{total}) ", end="")

        if specification.minOccurs != 0:
            self.print("*", end="")

        self.print(specification.name)
        self.set_style("cyan")
        self.print("    Applies to:")
        self.set_style("reset")
        for applicability in specification.applicability:
            self.print("        " + applicability.to_string("applicability"))
        if not total and specification.status is False:
            return
        self.set_style("cyan")
        self.print("    Requirements:")
        self.set_style("reset")
        for requirement in specification.requirements:
            self.set_style("reset")
            if requirement.failures:
                self.set_style("red")
            else:
                self.set_style("green")
            self.print("        " + requirement.to_string("requirement", specification, requirement))
            self.set_style("reset")
            for failure in requirement.failures[:10]:
                self.print("            ", end="")
                self.report_reason(failure)
            if len(requirement.failures) > 10:
                self.print("            " + f"... {len(requirement.failures)} in total ...")
        self.set_style("reset")

    def report_reason(self, failure: FacetFailure) -> None:
        is_bold = False
        # Alternate bold and reset for parts of the reason text.
        for substring in failure["reason"].split('"'):
            if is_bold:
                self.set_style("purple")
            else:
                self.set_style("reset")
            self.print(substring, end="")
            is_bold = not is_bold
        self.set_style("grey")
        self.print(" - " + str(failure["element"]))
        self.set_style("reset")

    def set_style(self, *colours: str):
        if self.use_colour:
            sys.stdout.write("".join([self.colours.get(c, "") for c in colours]))

    def print(self, txt: str, end: Optional[str] = None):
        if end is not None:
            print(txt, end=end)
        else:
            print(txt)

    # Added write method to enable file output from the Console reporter.
    def write(self, filepath: str) -> None:
        # Redirect stdout to the file during report generation.
        original_stdout = sys.stdout
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                sys.stdout = f
                self.report()
        finally:
            sys.stdout = original_stdout

###############################################################################
# Txt Reporter – plain text version (disables colour)
###############################################################################
class Txt(Console):
    def __init__(self, ids: Ids):
        super().__init__(ids, use_colour=False)
        self.text = ""

    def print(self, txt: str, end: Optional[str] = None):
        if end is None:
            self.text += txt + "\n"
        else:
            self.text += txt + end

    def to_string(self) -> str:
        return self.text

    def write(self, filepath: str) -> None:
        with open(filepath, "w", encoding="utf-8") as outfile:
            outfile.write(self.text)

###############################################################################
# JSON Reporter – produces a dictionary-based report for further processing.
###############################################################################
class Json(Reporter):
    def __init__(self, ids: Ids):
        super().__init__(ids)
        self.results: Results = {}  # type: ignore

    def report(self) -> Results:
        self.results["title"] = self.ids.info.get("title", "Untitled IDS")
        self.results["date"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.results["filepath"] = self.ids.filepath
        self.results["filename"] = self.ids.filename
        total_specifications = 0
        total_specifications_pass = 0
        total_requirements = 0
        total_requirements_pass = 0
        total_checks = 0
        total_checks_pass = 0
        status = True
        self.results["specifications"] = []
        for specification in self.ids.specifications:
            spec_report = self.report_specification(specification)
            self.results["specifications"].append(spec_report)
            total_specifications += 1
            total_specifications_pass += 1 if spec_report["status"] else 0
            total_requirements += len(spec_report["requirements"])
            total_requirements_pass += len([r for r in spec_report["requirements"] if r["status"]])
            total_checks += spec_report["total_checks"]
            total_checks_pass += spec_report["total_checks_pass"]
            if not spec_report["status"]:
                status = False
        self.results["status"] = status
        self.results["total_specifications"] = total_specifications
        self.results["total_specifications_pass"] = total_specifications_pass
        self.results["total_specifications_fail"] = total_specifications - total_specifications_pass
        self.results["percent_specifications_pass"] = (
            math.floor((total_specifications_pass / total_specifications) * 100)
            if total_specifications else "N/A"
        )
        self.results["total_requirements"] = total_requirements
        self.results["total_requirements_pass"] = total_requirements_pass
        self.results["total_requirements_fail"] = total_requirements - total_requirements_pass
        self.results["percent_requirements_pass"] = (
            math.floor((total_requirements_pass / total_requirements) * 100)
            if total_requirements else "N/A"
        )
        self.results["total_checks"] = total_checks
        self.results["total_checks_pass"] = total_checks_pass
        self.results["total_checks_fail"] = total_checks - total_checks_pass
        self.results["percent_checks_pass"] = (
            math.floor((total_checks_pass / total_checks) * 100)
            if total_checks else "N/A"
        )
        return self.results

    def report_specification(self, specification: Specification) -> ResultsSpecification:
        applicability = [a.to_string("applicability") for a in specification.applicability]
        total_applicable = len(specification.applicable_entities)
        total_checks = 0
        total_checks_pass = 0
        requirements = []
        for requirement in specification.requirements:
            total_fail = len(requirement.failures)
            total_pass = total_applicable - total_fail
            percent_pass = math.floor((total_pass / total_applicable) * 100) if total_applicable else "N/A"
            total_checks += total_applicable
            total_checks_pass += total_pass
            facet_type = type(requirement).__name__
            value = ""
            if facet_type == "Entity":
                if getattr(requirement, "predefinedType", None):
                    label = "IFC Class / Predefined Type"
                    value = f"{requirement.name}.{requirement.predefinedType}"
                else:
                    label = "IFC Class"
                    value = requirement.name
            elif facet_type == "Attribute":
                label = requirement.name
                if getattr(requirement, "value", None):
                    value = requirement.value
            elif facet_type == "Classification":
                if getattr(requirement, "system", None) and getattr(requirement, "value", None):
                    label = "System / Reference"
                    value = f"{requirement.system} / {requirement.value}"
                elif getattr(requirement, "system", None):
                    label = "System"
                    value = requirement.system
                elif getattr(requirement, "value", None):
                    label = "Reference"
                    value = requirement.value
            elif facet_type == "PartOf":
                label = requirement.relation
                if getattr(requirement, "predefinedType", None):
                    value = f"{requirement.name}.{requirement.predefinedType}"
                else:
                    value = requirement.name
            elif facet_type == "Property":
                label = f"{requirement.propertySet}.{requirement.baseName}"
                if getattr(requirement, "value", None):
                    value = requirement.value
            elif facet_type == "Material":
                label = "Name / Category"
                if getattr(requirement, "value", None):
                    value = requirement.value
            else:
                label = requirement.name

            requirements.append({
                "facet_type": facet_type,
                "metadata": requirement.asdict("requirement"),
                "label": label,
                "value": value,
                "description": requirement.to_string("requirement", specification, requirement),
                "status": requirement.status,
                "passed_entities": self.report_passed_entities(requirement),
                "failed_entities": self.report_failed_entities(requirement),
                "total_applicable": total_applicable,
                "total_pass": total_pass,
                "total_fail": total_fail,
                "percent_pass": percent_pass,
            })
        total_applicable_pass = total_applicable - len(specification.failed_entities)
        percent_applicable_pass = (
            math.floor((total_applicable_pass / total_applicable) * 100)
            if total_applicable else "N/A"
        )
        percent_checks_pass = (
            math.floor((total_checks_pass / total_checks) * 100)
            if total_checks else "N/A"
        )
        return {
            "name": specification.name,
            "description": specification.description,
            "instructions": specification.instructions,
            "status": specification.status,
            "is_ifc_version": specification.is_ifc_version,
            "total_applicable": total_applicable,
            "total_applicable_pass": total_applicable_pass,
            "total_applicable_fail": total_applicable - total_applicable_pass,
            "percent_applicable_pass": percent_applicable_pass,
            "total_checks": total_checks,
            "total_checks_pass": total_checks_pass,
            "total_checks_fail": total_checks - total_checks_pass,
            "percent_checks_pass": percent_checks_pass,
            "required": specification.minOccurs != 0,
            "applicability": applicability,
            "requirements": requirements,
        }

    def report_passed_entities(self, requirement: Facet) -> list[ResultsEntity]:
        return [
            {
                "element": e,
                "element_type": ifcopenshell.util.element.get_type(e),
                "class": e.is_a(),
                "predefined_type": ifcopenshell.util.element.get_predefined_type(e),
                "name": getattr(e, "Name", None),
                "description": getattr(e, "Description", None),
                "id": e.id(),
                "global_id": getattr(e, "GlobalId", None),
                "tag": getattr(e, "Tag", None),
                "reason": ""
            }
            for e in requirement.passed_entities
        ]

    def report_failed_entities(self, requirement: Facet) -> list[ResultsEntity]:
        return [
            {
                "reason": f["reason"],
                "element": f["element"],
                "element_type": ifcopenshell.util.element.get_type(f["element"]),
                "class": f["element"].is_a(),
                "predefined_type": ifcopenshell.util.element.get_predefined_type(f["element"]),
                "name": getattr(f["element"], "Name", None),
                "description": getattr(f["element"], "Description", None),
                "id": f["element"].id(),
                "global_id": getattr(f["element"], "GlobalId", None),
                "tag": getattr(f["element"], "Tag", None),
            }
            for f in requirement.failures
        ]

###############################################################################
# HTML Reporter – renders output via Mustache templating
###############################################################################
class Html(Json):
    def __init__(self, ids: Ids):
        super().__init__(ids)
        self.entity_limit = 100

    def report(self) -> None:
        # Generate standard JSON results
        super().report()
        # For each requirement, limit the number of entity details and group similar types.
        for spec in self.results["specifications"]:
            for req in spec["requirements"]:
                total_passed = len(req["passed_entities"])
                total_failed = len(req["failed_entities"])
                req["passed_entities"] = self.limit_entities(req["passed_entities"])
                req["failed_entities"] = self.limit_entities(req["failed_entities"])
                req["total_failed_entities"] = total_failed
                req["total_omitted_failures"] = total_failed - self.entity_limit if total_failed > self.entity_limit else 0
                req["has_omitted_failures"] = total_failed > self.entity_limit
                req["total_passed_entities"] = total_passed
                req["total_omitted_passes"] = total_passed - self.entity_limit if total_passed > self.entity_limit else 0
                req["has_omitted_passes"] = total_passed > self.entity_limit

    def limit_entities(self, entities):
        if len(entities) > self.entity_limit:
            if entities and "element_type" in entities[0] and entities[0]["element_type"]:
                return self.group_by_type(entities)
            return entities[:self.entity_limit]
        return entities

    def group_by_type(self, entities):
        results = []
        group_limit = 5
        grouped = {}
        for e in entities:
            etype = e["element_type"]
            grouped.setdefault(etype, []).append(e)
        total = 0
        for etype, ents in grouped.items():
            for i, entity in enumerate(ents):
                results.append(entity)
                total += 1
                if i >= group_limit:
                    results[-1]["type_name"] = getattr(etype, "Name", "Untyped")
                    results[-1]["type_tag"] = getattr(etype, "Tag", "")
                    results[-1]["type_global_id"] = getattr(etype, "GlobalId", "")
                    results[-1]["extra_of_type"] = len(ents) - i
                    if total >= self.entity_limit:
                        return results
                    break
                if total >= self.entity_limit:
                    results[-1]["type_name"] = getattr(etype, "Name", "Untyped")
                    results[-1]["type_tag"] = getattr(etype, "Tag", "")
                    results[-1]["type_global_id"] = getattr(etype, "GlobalId", "")
                    results[-1]["extra_of_type"] = len(ents) - i
                    return results
        return results

    def to_string(self) -> str:
        import pystache
        template_path = os.path.join(cwd, "templates", "report.html")
        with open(template_path, "r", encoding="utf-8") as file:
            template = file.read()
        return pystache.render(template, self.results)

    def write(self, filepath: str) -> None:
        import pystache
        template_path = os.path.join(cwd, "templates", "report.html")
        with open(template_path, "r", encoding="utf-8") as file:
            rendered = pystache.render(file.read(), self.results)
        with open(filepath, "w", encoding="utf-8") as outfile:
            outfile.write(rendered)

###############################################################################
# ODS Reporter – creates an OpenDocument Spreadsheet report
###############################################################################
class Ods(Json):
    def __init__(self, ids: Ids, excel_safe: bool = False):
        super().__init__(ids)
        self.excel_safe = excel_safe
        self.colours = {
            "h": "cccccc",  # Header color
            "p": "97cc64",  # Pass color
            "f": "fb5a3e",  # Fail color
            "t": "ffffff",  # Regular text color
        }

    def excel_safe_spreadsheet_name(self, name: str) -> str:
        if not self.excel_safe:
            return name
        warning = f'WARNING. Sheet name "{name}" is not valid for Excel and will be changed.'
        if not name or name == "History":
            print(warning)
            return "placeholder spreadsheet name"
        if name.startswith("'") or name.endswith("'"):
            print(warning)
            name = name.strip("'")
        pattern = r"[\\\/\?\*\:\[\]]"
        if re.search(pattern, name):
            name = re.sub(pattern, "", name)
            print(warning)
        if len(name) > 31:
            name = name[:31]
            print(warning)
        return name

    def write(self, filepath: str) -> None:
        from odf.opendocument import OpenDocumentSpreadsheet
        from odf.style import Style, TableCellProperties
        from odf.table import Table, TableRow, TableCell
        from odf.text import P
        self.doc = OpenDocumentSpreadsheet()
        self.cell_formats = {}
        for key, value in self.colours.items():
            style = Style(name=key, family="table-cell")
            style.addElement(TableCellProperties(backgroundcolor="#" + value))
            self.doc.automaticstyles.addElement(style)
            self.cell_formats[key] = style
        table = Table(name=self.excel_safe_spreadsheet_name(self.results["title"]))
        header_row = TableRow()
        headers = ["Specification", "Status", "Total Pass", "Total Checks", "Percentage Pass"]
        for header in headers:
            tc = TableCell(valuetype="string", stylename="h")
            tc.addElement(P(text=header))
            header_row.addElement(tc)
        table.addElement(header_row)
        for spec in self.results["specifications"]:
            row = TableRow()
            data = [
                spec["name"],
                "Pass" if spec["status"] else "Fail",
                str(spec["total_checks_pass"]),
                str(spec["total_checks"]),
                str(spec["percent_checks_pass"]),
            ]
            stylename = "p" if spec["status"] else "f"
            for col in data:
                tc = TableCell(valuetype="string", stylename=stylename)
                tc.addElement(P(text=col if col is not None else "NULL"))
                row.addElement(tc)
            table.addElement(row)
        self.doc.spreadsheet.addElement(table)
        self.doc.save(filepath, addsuffix=not filepath.lower().endswith(".ods"))

###############################################################################
# ODS Summary Reporter – creates a summary spreadsheet report.
###############################################################################
class OdsSummary(Json):
    def __init__(self, ids: Ids, excel_safe: bool = False):
        super().__init__(ids)
        self.excel_safe = excel_safe
        self.colours = {
            "h": "cccccc",
            "p": "97cc64",
            "f": "fb5a3e",
            "t": "ffffff",
        }

    def excel_safe_spreadsheet_name(self, name: str) -> str:
        if not self.excel_safe:
            return name
        warning = f'WARNING. Sheet name "{name}" is not valid for Excel and will be changed.'
        if not name or name == "History":
            print(warning)
            return "placeholder spreadsheet name"
        if name.startswith("'") or name.endswith("'"):
            print(warning)
            name = name.strip("'")
        pattern = r"[\\\/\?\*\:\[\]]"
        if re.search(pattern, name):
            name = re.sub(pattern, "", name)
            print(warning)
        if len(name) > 31:
            name = name[:31]
            print(warning)
        return name

    def write(self, filepath: str) -> None:
        from odf.opendocument import OpenDocumentSpreadsheet
        from odf.style import Style, TableCellProperties
        from odf.table import Table, TableRow, TableCell
        from odf.text import P
        self.doc = OpenDocumentSpreadsheet()
        self.cell_formats = {}
        for key, value in self.colours.items():
            style = Style(name=key, family="table-cell")
            style.addElement(TableCellProperties(backgroundcolor="#" + value))
            self.doc.automaticstyles.addElement(style)
            self.cell_formats[key] = style
        table = Table(name=self.excel_safe_spreadsheet_name(self.results["title"]))
        header_row = TableRow()
        headers = ["Specification", "Applicability", "Facet Type", "Data Name", "Value Requirements"]
        for header in headers:
            tc = TableCell(valuetype="string", stylename="h")
            tc.addElement(P(text=header))
            header_row.addElement(tc)
        table.addElement(header_row)
        for spec in self.results["specifications"]:
            applicability = ", ".join(spec["applicability"])
            for req in spec["requirements"]:
                row = TableRow()
                data = [
                    spec["name"],
                    applicability,
                    req["facet_type"],
                    req["label"],
                    req["value"],
                ]
                for col in data:
                    tc = TableCell(valuetype="string")
                    tc.addElement(P(text=col if col is not None else "NULL"))
                    row.addElement(tc)
                table.addElement(row)
        self.doc.spreadsheet.addElement(table)
        self.doc.save(filepath, addsuffix=not filepath.lower().endswith(".ods"))

###############################################################################
# BCF Reporter – produces a BCF project file using bcf-client.
###############################################################################

class Bcf(Json):
    def report_failed_entities(self, requirement: Facet) -> list[FacetFailure]:
        return [FacetFailure(f) for f in requirement.failures]

    def to_file(self, filepath: str) -> None:
        import numpy as np
        import ifcopenshell.util.placement
        from bcf.v2.bcfxml import BcfXml

        unit_scale = None
        bcfxml = BcfXml.create_new(self.results["title"])
        for specification in self.results["specifications"]:
            if specification["status"]:
                continue
            for requirement in specification["requirements"]:
                if requirement["status"]:
                    continue
                for failure in requirement["failed_entities"]:
                    element = failure["element"]
                    title_components = []
                    for title_component in [
                        element.is_a(),
                        getattr(element, "Name", "") or "Unnamed",
                        failure.get("reason", "No reason"),
                        getattr(element, "GlobalId", ""),
                        getattr(element, "Tag", ""),
                    ]:
                        if title_component:
                            title_components.append(title_component)
                    title = " - ".join(title_components)
                    description = f'{specification["name"]} - {requirement["description"]}'
                    topic = bcfxml.add_topic(title, description, "IfcTester")
                    if getattr(element, "ObjectPlacement", None):
                        placement = ifcopenshell.util.placement.get_local_placement(element.ObjectPlacement)
                        if unit_scale is None:
                            unit_scale = ifcopenshell.util.unit.calculate_unit_scale(element.wrapped_data.file)
                        location = [(o * unit_scale) + 5.0 for o in placement[:, 3][:3]]
                        viewpoint = topic.add_viewpoint_from_point_and_guids(np.array(location), element.GlobalId)
                    if element.is_a("IfcElement"):
                        topic.add_viewpoint(element)
        bcfxml.save_project(filepath)

    # --------------------------------------------------------------------------------
    # New write() method: delegate to to_file()
    def write(self, filepath: str) -> None:
        self.to_file(filepath)