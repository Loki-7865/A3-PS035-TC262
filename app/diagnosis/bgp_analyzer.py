
import ipaddress


def analyze_bgp(router_data):
    output = router_data.get("bgp", {}).get("output", "")
    router_name = router_data.get("router", "unknown").upper()
    findings = []

    if not router_data.get("bgp", {}).get("success", False):
        return [{
            "router": router_name,
            "severity": "CRITICAL",
            "type": "BGP_COLLECTION_FAILURE",
            "message": "Could not collect BGP summary.",
        }]

    found_neighbors = 0

    for line in output.splitlines():
        columns = line.split()

        # FRR neighbor rows start with an IP address and contain
        # the State/PfxRcd field at column index 9.
        if len(columns) < 10:
            continue

        try:
            ipaddress.ip_address(columns[0])
        except ValueError:
            continue

        if not columns[1].isdigit() or not columns[2].isdigit():
            continue

        neighbor_ip = columns[0]
        remote_as = int(columns[2])
        state = columns[9]
        found_neighbors += 1

        if state.isdigit():
            if int(state) == 0:
                findings.append({
                    "router": router_name,
                    "severity": "WARNING",
                    "type": "NO_PREFIXES_RECEIVED",
                    "neighbor": neighbor_ip,
                    "remote_as": remote_as,
                    "message": (
                        f"{router_name} receives zero prefixes "
                        f"from neighbor {neighbor_ip}."
                    ),
                })
        else:
            findings.append({
                "router": router_name,
                "severity": "CRITICAL",
                "type": "BGP_SESSION_NOT_ESTABLISHED",
                "neighbor": neighbor_ip,
                "remote_as": remote_as,
                "state": state,
                "message": (
                    f"BGP neighbor {neighbor_ip} on {router_name} "
                    f"is in state {state}, not Established."
                ),
            })

    if found_neighbors == 0 and "Total number of neighbors 0" not in output:
        findings.append({
            "router": router_name,
            "severity": "WARNING",
            "type": "NO_NEIGHBORS_PARSED",
            "message": "No BGP neighbor rows could be parsed.",
        })

    return findings
