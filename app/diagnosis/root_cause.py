
LINKS = [
    {
        "routers": ("r1", "r2"),
        "subnet": "10.0.12.0/30",
        "endpoints": ("10.0.12.1", "10.0.12.2"),
    },
    {
        "routers": ("r1", "r3"),
        "subnet": "10.0.13.0/30",
        "endpoints": ("10.0.13.1", "10.0.13.2"),
    },
    {
        "routers": ("r2", "r4"),
        "subnet": "10.0.24.0/30",
        "endpoints": ("10.0.24.1", "10.0.24.2"),
    },
    {
        "routers": ("r3", "r4"),
        "subnet": "10.0.34.0/30",
        "endpoints": ("10.0.34.1", "10.0.34.2"),
    },
    {
        "routers": ("r4", "r5"),
        "subnet": "10.0.45.0/30",
        "endpoints": ("10.0.45.1", "10.0.45.2"),
    },
]


def correlate_findings(findings):
    """
    Group BGP findings by the topology link they implicate.

    A link is a candidate root cause, not a confirmed physical fault.
    Multiple observations about the same link become one incident.
    """
    incidents = {}

    for finding in findings:
        neighbor = finding.get("neighbor")
        router = finding.get("router", "").lower()

        if not neighbor:
            continue

        for link in LINKS:
            routers = link["routers"]
            endpoints = link["endpoints"]

            matched = (
                (router == routers[0] and neighbor == endpoints[1])
                or (router == routers[1] and neighbor == endpoints[0])
            )

            if not matched:
                continue

            candidate_link = f"{routers[0].upper()}-{routers[1].upper()}"

            if candidate_link not in incidents:
                incidents[candidate_link] = {
                    "candidate_link": candidate_link,
                    "subnet": link["subnet"],
                    "severity": "WARNING",
                    "fault_type": "CORRELATED_BGP_INCIDENT",
                    "affected_routers": [],
                    "observations": [],
                    "evidence": "",
                    "assessment": (
                        "Multiple BGP observations implicate this link. "
                        "This is a candidate root cause, not proof of a "
                        "physical link failure. Verify both endpoints."
                    ),
                }

            incident = incidents[candidate_link]

            observation = {
                "router": router.upper(),
                "neighbor": neighbor,
                "severity": finding.get("severity", "UNKNOWN"),
                "fault_type": finding.get("type", "UNKNOWN"),
                "message": finding.get("message", ""),
            }

            # Avoid duplicate observations from the same router/neighbor/type.
            observation_key = (
                observation["router"],
                observation["neighbor"],
                observation["fault_type"],
            )

            existing_keys = {
                (
                    item["router"],
                    item["neighbor"],
                    item["fault_type"],
                )
                for item in incident["observations"]
            }

            if observation_key not in existing_keys:
                incident["observations"].append(observation)

            if router.upper() not in incident["affected_routers"]:
                incident["affected_routers"].append(router.upper())

            if finding.get("severity") == "CRITICAL":
                incident["severity"] = "CRITICAL"
            elif (
                finding.get("severity") == "WARNING"
                and incident["severity"] != "CRITICAL"
            ):
                incident["severity"] = "WARNING"

            break

    results = []

    for incident in incidents.values():
        incident["evidence"] = " ".join(
            item["message"]
            for item in incident["observations"]
            if item["message"]
        )

        incident["observation_count"] = len(incident["observations"])
        results.append(incident)

    return results
