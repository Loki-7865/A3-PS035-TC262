
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
ROUTERS = ["r1", "r2", "r3", "r4", "r5"]


def run_command(command, timeout=10):
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout.strip(),
            "error": result.stderr.strip(),
            "return_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "output": "",
            "error": "Command timed out",
            "return_code": None,
        }


def collect_router(router):
    container = f"clab-ps035-{router}"

    bgp = run_command([
        "docker", "exec", container,
        "vtysh", "-c", "show bgp summary",
    ])

    interfaces = run_command([
        "docker", "exec", container,
        "ip", "-br", "addr",
    ])

    return {
        "router": router,
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "bgp": bgp,
        "interfaces": interfaces,
        "healthy_collection": (
            bgp["success"] and interfaces["success"]
        ),
    }


def collect_snapshot():
    return {
        "project": "PS-035",
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "routers": [collect_router(router) for router in ROUTERS],
    }


def save_snapshot(snapshot):
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime(
        "%Y%m%dT%H%M%SZ"
    )
    output_file = DATA_DIR / f"telemetry_{timestamp}.json"

    output_file.write_text(
        json.dumps(snapshot, indent=2),
        encoding="utf-8",
    )
    return output_file


def main():
    snapshot = collect_snapshot()
    output_file = save_snapshot(snapshot)

    print(f"Telemetry saved to: {output_file.relative_to(PROJECT_ROOT)}")

    for router in snapshot["routers"]:
        status = (
            "OK" if router["healthy_collection"]
            else "COLLECTION ERROR"
        )
        print(f"{router['router'].upper()}: {status}")

        if not router["healthy_collection"]:
            if router["bgp"]["error"]:
                print(f"  BGP error: {router['bgp']['error']}")
            if router["interfaces"]["error"]:
                print(
                    f"  Interface error: "
                    f"{router['interfaces']['error']}"
                )


if __name__ == "__main__":
    main()
