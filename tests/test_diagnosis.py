
import unittest

from app.diagnosis.bgp_analyzer import analyze_bgp
from app.diagnosis.root_cause import correlate_findings


class DiagnosisTests(unittest.TestCase):

    def test_active_neighbor_is_detected_and_correlated(self):
        router_data = {
            "router": "r1",
            "bgp": {
                "success": True,
                "output": """IPv4 Unicast Summary:
Neighbor V AS MsgRcvd MsgSent TblVer InQ OutQ Up/Down State/PfxRcd PfxSnt Desc
10.0.12.2 4 65002 53 53 5 0 0 00:45:05 3 5 N/A
10.0.13.2 4 65003 0 0 0 0 0 never Active 0 N/A
Total number of neighbors 2"""
            },
        }

        findings = analyze_bgp(router_data)

        self.assertTrue(any(
            f["type"] == "BGP_SESSION_NOT_ESTABLISHED"
            and f["neighbor"] == "10.0.13.2"
            for f in findings
        ))

        correlated = correlate_findings(findings)

        self.assertTrue(any(
            f["candidate_link"] == "R1-R3"
            and f["subnet"] == "10.0.13.0/30"
            for f in correlated
        ))

    def test_healthy_neighbor_produces_no_findings(self):
        router_data = {
            "router": "r1",
            "bgp": {
                "success": True,
                "output": """IPv4 Unicast Summary:
Neighbor V AS MsgRcvd MsgSent TblVer InQ OutQ Up/Down State/PfxRcd PfxSnt Desc
10.0.12.2 4 65002 53 53 5 0 0 00:45:05 3 5 N/A
10.0.13.2 4 65003 52 52 5 0 0 00:44:57 3 5 N/A
Total number of neighbors 2"""
            },
        }

        self.assertEqual(analyze_bgp(router_data), [])


if __name__ == "__main__":
    unittest.main()
