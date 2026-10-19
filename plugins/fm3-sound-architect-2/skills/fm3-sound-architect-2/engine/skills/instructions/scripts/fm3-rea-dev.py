#!/usr/bin/env python3
"""Optional, offline REA source audit for FM3 Filter development. No device I/O."""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys

REA_VERSION = "6.4.0"
SCRIPTS = Path(__file__).resolve().parent
PLUGIN = SCRIPTS.parents[2]
SOURCES = [
    "fm3-filter-library.mjs", "fm3-filter-controls.mjs",
    "filter-collector/filter-check.mjs", "filter-collector/fm3-prototype.mjs",
    "filter-collector/fm3-codec.mjs", "drive-collector/fm3-prototype.mjs",
    "drive-collector/fm3-codec.mjs", "filter-control-collector/control-check.mjs",
    "filter-control-collector/fm3-prototype.mjs", "filter-control-collector/fm3-codec.mjs",
]
FILTER_REGISTRY_SHA = "02cc7820c37b19b9f5983023117c7e8f0108b73705d32d09f3eecc01ec0aa4ac"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def external_path(value):
    path = value.expanduser().resolve()
    if path == PLUGIN or PLUGIN in path.parents:
        raise ValueError("Toolchain and results must be outside the plugin package")
    return path


def install(toolchain):
    npm = shutil.which("npm")
    if not npm:
        raise ValueError("Install a supported Node.js with npm first; see the development guide")
    toolchain.mkdir(parents=True, exist_ok=False)
    for name in ["package.json", "package-lock.json"]:
        shutil.copyfile(SCRIPTS / "rea-dev" / name, toolchain / name)
    result = subprocess.run([npm, "ci", "--ignore-scripts", "--no-audit", "--no-fund"], cwd=toolchain)
    if result.returncode:
        raise ValueError("npm ci failed; the incomplete toolchain is retained for diagnosis")


def cli_path(toolchain):
    package = toolchain / "node_modules/rea-agents"
    manifest = json.loads((package / "package.json").read_text())
    if manifest.get("name") != "rea-agents" or manifest.get("version") != REA_VERSION:
        raise ValueError("This workflow requires the reviewed rea-agents@" + REA_VERSION)
    node = shutil.which("node")
    if not node:
        raise ValueError("Node.js is unavailable")
    return [node, str(package / "scripts/rea.mjs")]


def invoke(cli, command, output, log):
    with output.open("x") as stdout, log.open("x") as stderr:
        result = subprocess.run(cli + command + ["--format", "json"], stdout=stdout, stderr=stderr)
    try:
        data = json.loads(output.read_text())
    except (json.JSONDecodeError, UnicodeError):
        raise ValueError("REA did not return JSON; inspect " + str(log))
    return result.returncode, data


def summarize_graph(graph, manifest):
    if graph.get("schema") != "HistoricalSourceGraph":
        raise ValueError("Expected REA HistoricalSourceGraph, not partial application Evidence")
    entries = {p["path"]: p for p in graph["entries"] if p["kind"] == "file"}
    for name, expected in manifest.items():
        if entries.get(name, {}).get("sha256") != expected:
            raise ValueError("REA source digest mismatch: " + name)
    if graph["parse_failures"]:
        raise ValueError("REA reported source parse failures; inspect the retained graph")
    return {
        "status": "source-import-verified",
        "authority": graph["authority"],
        "inventoryState": graph["inventory_state"],
        "sourceFiles": len(manifest),
        "allSourceDigestsVerified": True,
        "parseFailures": len(graph["parse_failures"]),
        "relationships": dict(Counter(r["resolution"] for r in graph["relationships"])),
        "rootSha256": graph["root_sha256"],
        "limitations": graph["limitations"],
        "meaning": "Static source/import map only. HistoricalSourceGraph authority is preserved; not runtime, hardware or parameter-scale proof.",
    }


def candidate_check():
    # Our independent numerical comparison, NOT a result inferred by REA.
    raw = (SCRIPTS.parent / "references/filter-controls.json").read_bytes()
    if digest(raw) != FILTER_REGISTRY_SHA:
        raise ValueError("Filter registry changed; review this research check")
    ranges = {"frequencyHz": (20, 20000, True), "q": (.1, 10, True),
              "gainDb": (-20, 20, False), "levelDb": (-80, 20, False)}
    results = []
    for p in json.loads(raw)["points"]:
        low, high, logarithmic = ranges[p["field"]]
        value = p["targetValue"]
        unit = math.log(value / low) / math.log(high / low) if logarithmic else (value - low) / (high - low)
        candidate = math.floor(unit * 65534 + .5)
        results.append({"index": p["index"], "channel": p["channel"], "type": p["type"],
                        "field": p["field"], "targetValue": value, "displayValue": p["displayValue"],
                        "measuredRaw": p["raw"], "candidateRaw": candidate, "matches": candidate == p["raw"]})
    return {"authority": "independent offline numerical cross-check; not REA decompilation",
            "registrySha256": FILTER_REGISTRY_SHA, "points": results,
            "matched": sum(p["matches"] for p in results), "total": len(results),
            "encodingCandidate": "round(normalized target * 65534); log frequency/Q, linear Gain/Level",
            "writePermissionChanged": False,
            "limitations": ["These are previously measured points; no new hardware evidence.",
                            "Matching these points does not validate endpoints, interpolation, other types/channels or skipped Q=0.707.",
                            "Production Filter writes remain restricted to the existing exact measured values."]}


def audit(toolchain, output, deep):
    cli = cli_path(toolchain)
    output.mkdir(parents=True, exist_ok=False)
    stage = output / "input"
    stage.mkdir()
    manifest = {}
    for name in SOURCES:
        data = (SCRIPTS / name).read_bytes()
        manifest[name] = digest(data)
        dest = stage / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
    write_json(stage / "package.json", {"name": "fm3-filter-source-analysis", "private": True,
                                       "type": "module", "main": "fm3-filter-library.mjs"})
    write_json(output / "source-manifest.json", {"sourceRoot": str(SCRIPTS), "files": manifest,
                                               "scope": "Ten explicit Filter source modules; no target execution or device access"})
    code, graph = invoke(cli, ["import-reference-source", str(stage)], output / "source-graph.json", output / "source-graph.log")
    if code or "error" in graph:
        write_json(output / "summary.json", {"status": "source-import-failed", "exitCode": code, "error": graph.get("message", graph.get("error"))})
        return 1
    summary = {"reaVersion": REA_VERSION, "sourceAudit": summarize_graph(graph, manifest),
               "independentFilterCandidateCheck": candidate_check(),
               "applicationAnalysis": {"status": "not-run"}, "deviceIo": False}
    if deep:
        code, evidence = invoke(cli, ["analyze-javascript-application", str(stage), "--max-heap-mb", "1024",
                                     "--analysis-timeout-ms", "60000"], output / "application-evidence.json", output / "application-progress.log")
        failed = code != 0 or "error" in evidence
        summary["applicationAnalysis"] = {"status": "failed" if failed else "completed",
            "exitCode": code, "code": evidence.get("code"), "message": evidence.get("message"),
            "evidenceId": evidence.get("evidence_id"), "statistics": evidence.get("normalized_result", {}).get("statistics"),
            "limitations": evidence.get("limitations", []), "partialObservationIsSuccess": False}
    # Verify analysis did not alter any original or staged source bytes.
    for name, expected in manifest.items():
        if digest((SCRIPTS / name).read_bytes()) != expected or digest((stage / name).read_bytes()) != expected:
            raise ValueError("Source bytes changed during audit: " + name)
    summary["sourceBytesPreserved"] = True
    write_json(output / "summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 1 if summary["applicationAnalysis"]["status"] == "failed" else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--toolchain", required=True, type=Path, help="External REA dependency directory")
    parser.add_argument("--install", action="store_true", help="Install locked REA into a NEW external directory")
    parser.add_argument("--output", type=Path, help="NEW external results directory")
    parser.add_argument("--deep", action="store_true", help="Also try application analysis; its failure remains a failure")
    args = parser.parse_args()
    toolchain = external_path(args.toolchain)
    if args.install:
        install(toolchain)
    if args.output:
        return audit(toolchain, external_path(args.output), args.deep)
    if not args.install:
        parser.error("Provide --install and/or --output")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, KeyError) as exc:
        print("FM3 REA: " + str(exc), file=sys.stderr)
        sys.exit(1)
