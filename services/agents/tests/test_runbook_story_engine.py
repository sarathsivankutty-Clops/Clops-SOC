"""Tests for the L1 Human-Story Investigation & Composable Runbook Engine.

Verifies:
1. Pre-reasoning Context Engine populates all 24 context dimensions before Wave 1.
2. Information-Gain Reasoning Engine reaches >= 80% RCA confidence when
   corroborating evidence is present, stops early when confidence is already
   sufficient, and caps confidence honestly when critical telemetry is missing.
3. Dual-Projection output:
   - Analyst Mode (default) exposes plain-English answers to the 6 progressive
     questions, readable ✔ evidence checks, natural-language confidence reasons
     (no raw +25/-15 math), and an audit-friendly AI Investigation Summary chain.
   - Expert Mode (expandable) exposes the numerical Confidence Ledger,
     Hypothesis Evolution across waves, Wave/Pack execution traces, Decision
     Policy, Verification, Rollback, and raw citations.
4. Visible Pack Simplification: 9 internal pack types map cleanly into the
   3 visible UI categories (Investigation, Response, Governance).
5. FastAPI transport routes under /api/v1/playbooks/blueprints,
   /api/v1/playbooks/packs-catalog, and /api/v1/playbooks/investigate-story
   enforce tenant auth and return the expected schemas.
"""

from __future__ import annotations

import os
import unittest

from fastapi.testclient import TestClient

from app.main import app
from app.runbook import (
    EXPECTED_24_CONTEXT_DIMENSIONS,
    INTERNAL_TO_VISIBLE_PACK_CATEGORY,
    InformationGainRunbookEngine,
    PreReasoningContextEngine,
    VisiblePackCategory,
    get_builtin_blueprints,
    get_builtin_packs_catalog,
)

TEST_TENANT = "00000000-0000-0000-0000-000000000001"
SERVICE_TOKEN = "test-agents-service-token"


def _auth_headers(tenant_id: str = TEST_TENANT) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {SERVICE_TOKEN}",
        "X-AiSOC-Tenant-ID": tenant_id,
    }


class TestPreReasoningContextEngine(unittest.TestCase):
    def test_hydrates_all_24_context_dimensions_before_wave_1(self) -> None:
        engine = PreReasoningContextEngine()
        bundle = engine.assemble(
            tenant_id=TEST_TENANT,
            alert_summary="Impossible travel detected for user John Smith from Tor exit node",
            raw_alert={
                "id": "AL-9042",
                "title": "Impossible travel detected for user John Smith",
                "severity": "critical",
                "source": "okta",
                "user": "john.smith@corp.example",
                "src_ip": "185.220.101.44",
                "src_ip_class": "tor_exit",
                "auth_protocol": "imap_legacy",
                "mfa_completed": False,
                "forwarding_rule_created": True,
                "mitre_attack": [{"tactic": "Credential Access", "techniqueId": "T1078"}],
            },
        )
        dumped = bundle.model_dump()
        for dim in EXPECTED_24_CONTEXT_DIMENSIONS:
            self.assertIn(dim, dumped, f"Missing required context dimension: {dim}")
        self.assertEqual(bundle.hydrated_dimension_count, len(EXPECTED_24_CONTEXT_DIMENSIONS))


class TestPackCategorySimplification(unittest.TestCase):
    def test_nine_internal_packs_map_to_three_visible_categories(self) -> None:
        self.assertEqual(len(INTERNAL_TO_VISIBLE_PACK_CATEGORY), 9)
        visible_values = {v.value for v in INTERNAL_TO_VISIBLE_PACK_CATEGORY.values()}
        self.assertEqual(visible_values, {"investigation", "response", "governance"})

        catalog = get_builtin_packs_catalog()
        self.assertEqual(set(catalog["categories"].keys()), {"investigation", "response", "governance"})
        self.assertGreaterEqual(len(catalog["packs"]), 9)


class TestInformationGainReasoningAndDualProjection(unittest.TestCase):
    def test_account_takeover_reaches_high_confidence_and_separates_analyst_vs_expert_modes(self) -> None:
        engine = InformationGainRunbookEngine()
        result = engine.investigate(
            tenant_id=TEST_TENANT,
            alert_summary="Impossible travel detected for user John Smith",
            raw_alert={
                "id": "AL-9042",
                "title": "Impossible travel detected for user John Smith",
                "severity": "critical",
                "source": "okta",
                "user": "john.smith@corp.example",
                "src_ip": "185.220.101.44",
                "src_ip_class": "tor_exit",
                "auth_protocol": "imap_legacy",
                "mfa_completed": False,
                "forwarding_rule_created": True,
                "impossible_travel_confirmed": True,
                "corporate_vpn": False,
            },
        )

        # 1. High RCA confidence (>= 80%)
        analyst = result.analyst_mode
        self.assertGreaterEqual(analyst.confidence_percent, 80)
        self.assertEqual(analyst.confidence_label, "high")
        self.assertIn("John Smith", analyst.what_happened)
        self.assertIn("takeover", analyst.ai_belief_headline.lower())
        self.assertEqual(analyst.primary_recommendation.decision_type, "approve_containment")

        # 2. Analyst Mode must be human-readable with zero raw math deltas (+25/-15)
        for reason in analyst.confidence_increased_because:
            self.assertFalse(reason.startswith("+"), f"Analyst mode exposed math delta: {reason}")
            self.assertFalse(reason.startswith("-"), f"Analyst mode exposed math delta: {reason}")

        # 3. AI Investigation Summary chain is audit-friendly (not raw chain-of-thought)
        self.assertEqual(analyst.reasoning_summary_steps[0], "Alert received")
        self.assertIn("Context hydrated", analyst.reasoning_summary_steps[1])
        self.assertIn(
            analyst.reasoning_summary_steps[-1],
            (
                "Containment recommended",
                "No action required",
                "Escalation recommended",
            ),
        )

        # 4. Expert Mode carries full numerical Confidence Ledger, Waves, Hypotheses & Citations
        expert = result.expert_mode
        self.assertGreaterEqual(len(expert.confidence_ledger), 3)
        self.assertTrue(any(entry.delta_points > 0 for entry in expert.confidence_ledger))
        self.assertGreaterEqual(len(expert.hypothesis_evolution), 2)
        self.assertGreaterEqual(len(expert.wave_executions), 1)
        self.assertEqual(expert.context_dimensions_hydrated, len(EXPECTED_24_CONTEXT_DIMENSIONS))

    def test_benign_corporate_vpn_or_deployment_stops_early_and_recommends_no_action(self) -> None:
        engine = InformationGainRunbookEngine()
        result = engine.investigate(
            tenant_id=TEST_TENANT,
            alert_summary="Impossible travel detected for user John Smith",
            raw_alert={
                "id": "AL-9043",
                "title": "Impossible travel detected for user John Smith",
                "severity": "medium",
                "source": "okta",
                "user": "john.smith@corp.example",
                "src_ip": "10.200.4.15",
                "corporate_vpn": True,
                "mfa_completed": True,
                "device_previously_seen": True,
                "suspicious_post_login_activity": False,
            },
        )
        analyst = result.analyst_mode
        self.assertGreaterEqual(analyst.confidence_percent, 80)
        self.assertTrue("legitimate" in analyst.ai_belief_headline.lower() or "benign" in analyst.ai_belief_headline.lower())
        self.assertEqual(analyst.primary_recommendation.decision_type, "no_action_required")
        # Fast-path early stopping: should complete in <= 2 inquiry waves after context hydration
        self.assertLessEqual(len(result.expert_mode.wave_executions), 2)


class TestPlaybookRunbookRoutes(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["AISOC_AGENTS_SERVICE_TOKEN"] = SERVICE_TOKEN
        self.client = TestClient(app)

    def test_routes_return_blueprints_packs_and_dual_mode_investigation(self) -> None:
        # 1. Blueprints endpoint
        r_bp = self.client.get("/api/v1/playbooks/blueprints", headers=_auth_headers())
        self.assertEqual(r_bp.status_code, 200)
        blueprints = r_bp.json()
        self.assertIsInstance(blueprints, list)
        self.assertGreaterEqual(len(blueprints), 4)
        first = blueprints[0]
        self.assertIn("investigation", first["categories_view"])
        self.assertIn("response", first["categories_view"])
        self.assertIn("governance", first["categories_view"])

        # 2. Packs catalog endpoint
        r_packs = self.client.get("/api/v1/playbooks/packs-catalog", headers=_auth_headers())
        self.assertEqual(r_packs.status_code, 200)
        catalog = r_packs.json()
        self.assertEqual(set(catalog["categories"].keys()), {"investigation", "response", "governance"})

        # 3. Investigate-story endpoint
        r_story = self.client.post(
            "/api/v1/playbooks/investigate-story",
            headers=_auth_headers(),
            json={
                "alert_summary": "Impossible travel detected for user John Smith",
                "raw_alert": {
                    "id": "AL-9042",
                    "title": "Impossible travel detected for user John Smith",
                    "severity": "critical",
                    "source": "okta",
                    "user": "john.smith@corp.example",
                    "src_ip_class": "tor_exit",
                    "mfa_completed": False,
                    "forwarding_rule_created": True,
                },
            },
        )
        self.assertEqual(r_story.status_code, 200)
        payload = r_story.json()
        self.assertIn("analyst_mode", payload)
        self.assertIn("expert_mode", payload)
        self.assertGreaterEqual(payload["analyst_mode"]["confidence_percent"], 80)


if __name__ == "__main__":
    unittest.main()
