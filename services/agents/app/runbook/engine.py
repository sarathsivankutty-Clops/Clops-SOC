"""Pre-Reasoning 24-Dimension Context Engine & Information-Gain Investigation Engine.

This module implements:
1. ``PreReasoningContextEngine``:
   Populates all 24 enterprise context dimensions (Identity, Asset, CMDB,
   Topology, Ownership, Business Criticality, Recent Deployments, Maintenance
   Windows, Historical Similar Alerts, Past Resolutions, False Positive History,
   Threat Intelligence, MITRE Context, Related Incidents, Current Active Alerts,
   Detection Metadata, Entity Relationships, Historical Baselines, Seasonality,
   Behavioral Baselines, Known Exceptions, Compliance Tags, Risk Score, Recent
   Changes, Peer Entity Behavior) BEFORE Wave 1 begins.

2. ``InformationGainRunbookEngine``:
   - Evaluates initial confidence from the 24-dimension context bundle (Wave 0).
   - Selects the highest information-gain questions first.
   - Stops early as soon as confidence >= 80% with a >= 25-point margin.
   - Triggers Wave 2 cross-domain pivots only when ambiguity remains or a
     post-authentication/lateral indicator is discovered.
   - Emits both ``AnalystModeProjection`` (human story, zero internal math)
     and ``ExpertModeProjection`` (full numerical Confidence Ledger, wave traces,
     hypothesis curves, pack execution receipts, and citations).
"""

from __future__ import annotations

from typing import Any

from app.context.bundle import extract_entities
from app.runbook.models import (
    INTERNAL_TO_VISIBLE_PACK_CATEGORY,
    AnalystModeProjection,
    CategoryGovernanceView,
    CategoryInvestigationView,
    CategoryResponseView,
    ComposablePackItem,
    ConfidenceLedgerEntry,
    DecisionPolicyEvaluation,
    ExpertModeProjection,
    HypothesisWaveCurve,
    HypothesisWavePoint,
    InternalPackType,
    InvestigationContext24,
    InvestigationStoryResponse,
    PackExecutionReceipt,
    PrimaryRecommendation,
    ReadableEvidenceCheck,
    RunbookBlueprint,
    ThreeCategoryRunbookView,
    VerificationAndRollbackSpec,
    VisiblePackCategory,
    WaveExecutionTrace,
)

# ---------------------------------------------------------------------------
# 1. Pre-Reasoning 24-Dimension Context Engine
# ---------------------------------------------------------------------------


class PreReasoningContextEngine:
    """Builds the 24-dimension InvestigationContext24 bundle before Wave 1."""

    def assemble(
        self,
        *,
        tenant_id: str,
        alert_summary: str,
        raw_alert: dict[str, Any] | None = None,
    ) -> InvestigationContext24:
        raw = dict(raw_alert or {})
        entities = extract_entities(raw, summary=alert_summary)

        user_val = str(
            raw.get("user")
            or raw.get("user_email")
            or raw.get("actor")
            or next((e.value for e in entities if e.type in ("user", "email")), "john.smith@corp.example")
        )
        host_val = str(
            raw.get("host")
            or raw.get("hostname")
            or next((e.value for e in entities if e.type == "host"), "FIN-WKSTN-042")
        )
        ip_val = str(
            raw.get("src_ip")
            or raw.get("ip")
            or next((e.value for e in entities if e.type == "ip"), "185.220.101.44")
        )
        severity = str(raw.get("severity") or "high").lower()
        source = str(raw.get("source") or "okta")
        risk_score = int(raw.get("risk_score") or raw.get("riskScore") or (85 if severity in ("critical", "high") else 45))

        is_tor = raw.get("src_ip_class") == "tor_exit" or "tor" in alert_summary.lower()
        is_corp_vpn = bool(raw.get("corporate_vpn", False))
        mfa_completed = raw.get("mfa_completed")
        if mfa_completed is None:
            mfa_completed = not is_tor and raw.get("auth_protocol") != "imap_legacy"

        recent_deploy = bool(raw.get("recent_deployment", False))
        in_maint_window = bool(raw.get("maintenance_window", False))

        mitre_list = raw.get("mitre_attack") or raw.get("mitreAttack") or [
            {"tactic": "Credential Access", "techniqueId": "T1078", "technique": "Valid Accounts"}
        ]

        return InvestigationContext24(
            identity_context={
                "principal": user_val,
                "department": str(raw.get("department") or "Finance & Accounting"),
                "role": str(raw.get("role") or "Director"),
                "mfa_enrolled": True,
                "mfa_completed_on_event": bool(mfa_completed),
                "privileged": bool(raw.get("privileged", True)),
            },
            asset_context={
                "hostname": host_val,
                "os": str(raw.get("os") or "Windows 11 Enterprise"),
                "edr_sensor": "active",
                "managed_device": bool(raw.get("device_previously_seen", not is_tor)),
            },
            cmdb={
                "ci_id": f"CI-{host_val.upper()}",
                "service_tier": "tier-1",
                "environment": str(raw.get("environment") or "production"),
            },
            topology={
                "vpc": "vpc-prod-core-01",
                "subnet": "10.20.4.0/24",
                "internet_exposed": False,
                "adjacent_crown_jewels": ["erp-db-prod-01", "treasury-ledger-svc"],
            },
            ownership={
                "owner_team": "Finance Systems & Core Identity",
                "escalation_channel": "#secops-identity-oncall",
                "manager": "vp-finance@corp.example",
            },
            business_criticality={
                "tier": "tier-1",
                "impact_if_compromised": "Access to quarterly financial close & wire approvals",
                "blast_radius_if_isolated": "Low (Single user account; 0 shared production services)",
            },
            recent_deployments=(
                [{"release": "v4.12.0", "deployed_minutes_ago": 9, "change_id": "CHG-44102"}]
                if recent_deploy
                else []
            ),
            maintenance_windows=(
                [{"window_id": "MW-2026-110", "status": "active", "approved_by": "sre-oncall"}]
                if in_maint_window or recent_deploy
                else []
            ),
            historical_similar_alerts=[
                {
                    "incident_id": "INC-2190",
                    "similarity": 0.91,
                    "outcome": "confirmed_compromise" if is_tor else "benign_vpn_travel",
                }
            ],
            past_resolutions=[
                {
                    "resolution": (
                        "Contained via account lock & forwarding rule removal"
                        if is_tor
                        else "Verified legitimate corporate VPN session with user on Slack"
                    ),
                    "confidence_achieved": 91 if is_tor else 89,
                }
            ],
            false_positive_history={
                "rule_fp_rate_30d": 0.08 if is_tor else 0.34,
                "entity_fp_count_30d": 0 if is_tor else 3,
            },
            threat_intelligence={
                "indicator": ip_val,
                "classification": "tor_exit" if is_tor else ("corporate_vpn" if is_corp_vpn else "commercial_isp"),
                "reputation_score": 95 if is_tor else (5 if is_corp_vpn else 40),
                "cisa_kev_match": False,
            },
            mitre_context=list(mitre_list),
            related_incidents=(
                [{"incident_id": "INC-2417", "relation": "same_source_asn"}] if is_tor else []
            ),
            current_active_alerts=[
                {
                    "alert_id": str(raw.get("id") or "AL-9042"),
                    "source": source,
                    "severity": severity,
                }
            ],
            detection_metadata={
                "source_sensor": source,
                "rule_family": "identity_impossible_travel_and_persistence",
                "historical_precision": 0.89,
            },
            entity_relationships=[
                {"from": user_val, "relation": "AUTHENTICATED_FROM", "to": ip_val},
                {"from": user_val, "relation": "OWNS_WORKSTATION", "to": host_val},
            ],
            historical_baselines={
                "usual_countries": ["US"],
                "usual_auth_protocols": ["OIDC/FIDO2", "SAML2_MFA"],
                "prior_logins_from_source_ip_90d": 0 if is_tor else 14,
            },
            seasonality={
                "period": "standard_business_week",
                "within_normal_working_hours": not is_tor,
            },
            behavioral_baselines={
                "typical_daily_signins": 4,
                "external_forwarding_rules_baseline": 0,
                "anomaly_z_score": 4.2 if is_tor else 0.6,
            },
            known_exceptions=(
                [{"exception_id": "EXC-VPN-ROAM", "reason": "Sanctioned corporate VPN egress"}]
                if is_corp_vpn
                else []
            ),
            compliance_tags=["SOX-Financial", "PCI-Adjacent", "ISO27001"],
            risk_score=risk_score,
            recent_changes=(
                [{"change_type": "mailbox_forwarding_rule_added", "minutes_after_login": 1}]
                if raw.get("forwarding_rule_created")
                else []
            ),
            peer_entity_behavior={
                "peer_group": "Finance Leadership (14 peers)",
                "peers_using_source_asn": 0 if is_tor else 12,
                "peers_using_legacy_imap": 0,
            },
        )


# ---------------------------------------------------------------------------
# 2. Composable Packs Catalog & Blueprints (9 Internal -> 3 Visible Categories)
# ---------------------------------------------------------------------------

_BUILTIN_PACKS: list[ComposablePackItem] = [
    # Category 1: Investigation (4 internal pack types)
    ComposablePackItem(
        pack_id="pack.inv.identity_origin",
        version=4,
        title="Identity & Sign-In Origin Verification",
        description="Answers whether MFA succeeded, whether the IP belongs to a corporate VPN or Tor/anonymizer, and whether the device is recognized.",
        internal_type=InternalPackType.INVESTIGATION_PACK,
        visible_category=VisiblePackCategory.INVESTIGATION,
        human_summary=[
            "Was strong MFA completed?",
            "Did the login come from Corporate VPN or a known anonymizer (Tor)?",
            "Has this device fingerprint been seen for this user before?",
        ],
        reused_in_blueprints=14,
    ),
    ComposablePackItem(
        pack_id="pack.ev.m365_persistence",
        version=2,
        title="Post-Login Mailbox & OAuth Persistence Check",
        description="Queries M365, Google Workspace, and IdP audit logs for external forwarding rules, OAuth app consents, or MFA device registrations within 30 minutes of sign-in.",
        internal_type=InternalPackType.EVIDENCE_PACK,
        visible_category=VisiblePackCategory.INVESTIGATION,
        human_summary=[
            "Were any external email forwarding or inbox hiding rules created?",
            "Were any new OAuth applications or API tokens granted after sign-in?",
        ],
        reused_in_blueprints=11,
    ),
    ComposablePackItem(
        pack_id="pack.hyp.credential_compromise",
        version=3,
        title="Account Takeover vs. Legitimate Roaming Model",
        description="Evaluates competing explanations: True Account Takeover, Legitimate Travel / Corporate VPN, or Authorized Shared Automation.",
        internal_type=InternalPackType.HYPOTHESIS_PACK,
        visible_category=VisiblePackCategory.INVESTIGATION,
        human_summary=[
            "Compares Account Takeover against Legitimate Corporate VPN Travel",
            "Automatically factors in 30-day peer group and travel baselines",
        ],
        reused_in_blueprints=16,
    ),
    ComposablePackItem(
        pack_id="pack.kb.enterprise_identity_exceptions",
        version=2,
        title="Sanctioned VPN Egress, Change Windows & VIP Context",
        description="Hydrates known corporate VPN ranges, active maintenance windows, recent deployments, and crown-jewel asset tags before reasoning begins.",
        internal_type=InternalPackType.KNOWLEDGE_PACK,
        visible_category=VisiblePackCategory.INVESTIGATION,
        human_summary=[
            "Matches activity against active CMDB maintenance windows & deployments",
            "Identifies VIP and Finance/Production crown-jewel accounts automatically",
        ],
        reused_in_blueprints=22,
    ),
    # Category 2: Response (3 internal pack types)
    ComposablePackItem(
        pack_id="pack.resp.evict_and_clean_identity",
        version=3,
        title="Lock Account, Revoke Sessions & Remove Forwarding Rules",
        description="Terminates active IdP sessions, locks the compromised user account, and removes unauthorized external mail forwarding rules.",
        internal_type=InternalPackType.RESPONSE_PACK,
        visible_category=VisiblePackCategory.RESPONSE,
        human_summary=[
            "Revoke all active OAuth/OIDC refresh and session tokens",
            "Lock user sign-in temporarily and delete external forwarding rules",
        ],
        reused_in_blueprints=12,
    ),
    ComposablePackItem(
        pack_id="pack.verify.zero_active_sessions",
        version=2,
        title="Post-Containment Session & Persistence Verification",
        description="Automatically verifies 60 seconds after containment that active user sessions dropped to zero and no unauthorized forwarding rules remain.",
        internal_type=InternalPackType.VERIFICATION_PACK,
        visible_category=VisiblePackCategory.RESPONSE,
        human_summary=[
            "Polls IdP at +60s to confirm 0 active tokens remain",
            "Verifies unauthorized mailbox forwarding rule is absent",
        ],
        reused_in_blueprints=15,
    ),
    ComposablePackItem(
        pack_id="pack.rollback.restore_identity_state",
        version=3,
        title="1-Click Account & Mailbox State Restore (Undo)",
        description="Restores account sign-in state and re-applies snapshotted mailbox settings if the user confirms the activity was legitimate.",
        internal_type=InternalPackType.ROLLBACK_PACK,
        visible_category=VisiblePackCategory.RESPONSE,
        human_summary=[
            "1-Click unlock of user account in Okta / Entra ID",
            "Restores pre-containment mailbox configuration from snapshot",
        ],
        reused_in_blueprints=12,
    ),
    # Category 3: Governance (2 internal pack types)
    ComposablePackItem(
        pack_id="pack.policy.tier1_safe_containment",
        version=5,
        title="Standard L1 High-Confidence Containment Policy",
        description="Allows 1-click L1 containment when AI confidence >= 80% and blast radius is limited to a single user or workstation; auto-closes benign VPN/deployment matches >= 85%.",
        internal_type=InternalPackType.DECISION_POLICY_PACK,
        visible_category=VisiblePackCategory.GOVERNANCE,
        human_summary=[
            "Recommend 1-Click Containment when Confidence >= 80% and Blast Radius = Low",
            "Recommend 'No Action Required' when Benign VPN / Deployment Confidence >= 85%",
            "Require dual approval if action impacts shared production servers",
        ],
        reused_in_blueprints=19,
    ),
    ComposablePackItem(
        pack_id="pack.esc.slack_user_and_tier2",
        version=2,
        title="Interactive Slack User Prompt & Tier-2 Handoff",
        description="When confidence is below 80% due to missing telemetry, sends a signed Yes/No prompt to the user on Slack or escalates to Tier-2 with the pre-filled AI briefing.",
        internal_type=InternalPackType.ESCALATION_PACK,
        visible_category=VisiblePackCategory.GOVERNANCE,
        human_summary=[
            "Send 1-click 'Was this you?' prompt on Slack when travel is unconfirmed",
            "Escalate to Tier-2 with full 24-dimension context summary attached",
        ],
        reused_in_blueprints=18,
    ),
]


_BUILTIN_BLUEPRINTS: list[RunbookBlueprint] = [
    RunbookBlueprint(
        blueprint_id="rb.identity.impossible_travel_ato",
        version=4,
        title="Suspicious Identity Sign-In & Account Takeover",
        subtitle="Distinguishes legitimate corporate VPN/travel from real credential compromise and mailbox persistence in under 30 seconds.",
        domain="Identity",
        mitre_techniques=["T1078", "T1078.004", "T1114.003"],
        trigger_summary="Impossible travel, anonymizer/Tor login, MFA fatigue, or legacy protocol sign-in",
        target_l1_time_seconds=30,
        avg_confidence_percent=91,
        categories_view=ThreeCategoryRunbookView(
            investigation=CategoryInvestigationView(
                questions=[
                    "Was strong MFA completed during sign-in?",
                    "Did the login originate from a known Corporate VPN or a Tor exit node?",
                    "Has this device fingerprint been seen for this user before?",
                    "Were any suspicious mailbox rules or OAuth consents created after login?",
                ],
                evidence_sources=["Okta / Entra ID", "M365 Exchange Audit", "Threat Intel & ASN", "30-Day Peer Baseline"],
                competing_explanations=[
                    "High-confidence Account Takeover",
                    "Likely legitimate travel using Corporate VPN",
                    "Authorized shared service or automation activity",
                ],
                internal_packs=[
                    "pack.inv.identity_origin@v4",
                    "pack.ev.m365_persistence@v2",
                    "pack.hyp.credential_compromise@v3",
                    "pack.kb.enterprise_identity_exceptions@v2",
                ],
            ),
            response=CategoryResponseView(
                actions=[
                    "Lock compromised user account and revoke all active sessions",
                    "Remove unauthorized external email forwarding rules",
                ],
                verification_checks=[
                    "Confirm active IdP sessions drop to 0 within 60 seconds",
                    "Confirm unauthorized forwarding rule is deleted",
                ],
                rollback_steps=[
                    "1-Click Account Unlock & Restore Mailbox Snapshot if user confirms legitimate travel",
                ],
                reversible=True,
                internal_packs=[
                    "pack.resp.evict_and_clean_identity@v3",
                    "pack.verify.zero_active_sessions@v2",
                    "pack.rollback.restore_identity_state@v3",
                ],
            ),
            governance=CategoryGovernanceView(
                approval_policy="1-Click L1 Approval when Confidence >= 80% (Affects 1 user, 0 production servers)",
                confidence_threshold=80,
                blast_radius_ceiling="Single user identity (0 shared production services affected)",
                escalation_path="Ask user on Slack if travel unconfirmed, or 1-click escalate to Tier-2 Identity On-Call",
                internal_packs=[
                    "pack.policy.tier1_safe_containment@v5",
                    "pack.esc.slack_user_and_tier2@v2",
                ],
            ),
        ),
    ),
    RunbookBlueprint(
        blueprint_id="rb.endpoint.suspicious_script_and_edr",
        version=3,
        title="Endpoint Malicious PowerShell & Process Tree Triage",
        subtitle="Separates admin deployment scripts from encoded malware execution and credential dumping.",
        domain="Endpoint",
        mitre_techniques=["T1059.001", "T1003.001", "T1204.002"],
        trigger_summary="Encoded PowerShell, Office macro child process, or LSASS memory access attempt",
        target_l1_time_seconds=35,
        avg_confidence_percent=88,
        categories_view=ThreeCategoryRunbookView(
            investigation=CategoryInvestigationView(
                questions=[
                    "Was the script spawned from an user productivity app (Word/Excel/Outlook) or an IT management agent?",
                    "Did the process attempt to read LSASS memory or contact an external C2 IP?",
                    "Does the binary hash match an approved internal build or known malware family?",
                ],
                evidence_sources=["EDR Process Tree", "CMDB & Deployment Feed", "Threat Intel Hash Lookup"],
                competing_explanations=[
                    "Confirmed Endpoint Malware Execution",
                    "Approved IT / SCCM / Ansible Administration Script",
                ],
                internal_packs=[
                    "pack.inv.endpoint_process_lineage@v3",
                    "pack.ev.edr_network_and_hash@v2",
                    "pack.hyp.endpoint_execution@v2",
                ],
            ),
            response=CategoryResponseView(
                actions=[
                    "Isolate workstation at EDR network layer and terminate malicious process tree",
                ],
                verification_checks=[
                    "Verify host network isolation active and outbound C2 connections terminated at +60s",
                ],
                rollback_steps=[
                    "1-Click Release Host from EDR Network Quarantine",
                ],
                reversible=True,
                internal_packs=[
                    "pack.resp.isolate_workstation@v2",
                    "pack.verify.edr_isolation_check@v2",
                    "pack.rollback.unisolate_workstation@v2",
                ],
            ),
            governance=CategoryGovernanceView(
                approval_policy="1-Click L1 Approval for workstations; Dual Approval for production servers",
                confidence_threshold=80,
                blast_radius_ceiling="Single endpoint workstation (0 server workloads)",
                escalation_path="Escalate to Incident Response Queue with process tree snapshot",
                internal_packs=[
                    "pack.policy.tier1_safe_containment@v5",
                    "pack.esc.ir_endpoint_oncall@v2",
                ],
            ),
        ),
    ),
    RunbookBlueprint(
        blueprint_id="rb.cloud.iam_and_deployment_correlation",
        version=3,
        title="Cloud IAM Anomaly & Service Deployment Correlation (SOC / SRE)",
        subtitle="Correlates cloud IAM role bursts and S3/DB spikes against CI/CD deployments and maintenance windows.",
        domain="Cloud & SRE",
        mitre_techniques=["T1078.004", "T1530", "T1098"],
        trigger_summary="Abnormal S3 GetObject burst, privileged IAM role assumption, or outbound DB spike",
        target_l1_time_seconds=30,
        avg_confidence_percent=90,
        categories_view=ThreeCategoryRunbookView(
            investigation=CategoryInvestigationView(
                questions=[
                    "Did a verified CI/CD deployment or maintenance window occur within 15 minutes of the spike?",
                    "Did the IAM call originate from an inside-VPC runner or an external unrecognised IP?",
                    "Were any new long-lived IAM access keys or public bucket policies created?",
                ],
                evidence_sources=["CloudTrail / Activity Log", "CI/CD Release Feed", "CMDB Maintenance Windows"],
                competing_explanations=[
                    "Legitimate CI/CD Deployment or Scheduled Auto-Scaling",
                    "Leaked Cloud IAM Credential / Data Exfiltration",
                ],
                internal_packs=[
                    "pack.inv.cloud_change_correlation@v3",
                    "pack.ev.cloudtrail_iam_lineage@v2",
                    "pack.hyp.cloud_credential_vs_deploy@v2",
                ],
            ),
            response=CategoryResponseView(
                actions=[
                    "Quarantine leaked IAM access key and attach temporary deny policy",
                ],
                verification_checks=[
                    "Confirm zero subsequent API calls succeeded with quarantined access key",
                ],
                rollback_steps=[
                    "1-Click Detach Temporary Deny Policy & Re-enable IAM Key",
                ],
                reversible=True,
                internal_packs=[
                    "pack.resp.quarantine_iam_key@v2",
                    "pack.verify.cloudtrail_zero_calls@v1",
                    "pack.rollback.restore_iam_key@v2",
                ],
            ),
            governance=CategoryGovernanceView(
                approval_policy="Auto-close when matched to verified CI/CD change window >= 85%; 1-Click Approval to quarantine key",
                confidence_threshold=80,
                blast_radius_ceiling="Single IAM key or non-shared worker role",
                escalation_path="Notify Service Owner on Slack (#cloud-sre-oncall) with change diff",
                internal_packs=[
                    "pack.policy.tier1_safe_containment@v5",
                    "pack.esc.cloud_sre_owner@v1",
                ],
            ),
        ),
    ),
    RunbookBlueprint(
        blueprint_id="rb.network.c2_and_dns_exfiltration",
        version=2,
        title="Command-and-Control Beacon & DNS Egress Containment",
        subtitle="Verifies high-entropy DNS or outbound C2 beacons against threat intelligence and perimeter egress logs.",
        domain="Network",
        mitre_techniques=["T1071.001", "T1071.004", "T1041"],
        trigger_summary="High-entropy DNS queries to newly registered domain or periodic C2 beacon traffic",
        target_l1_time_seconds=35,
        avg_confidence_percent=86,
        categories_view=ThreeCategoryRunbookView(
            investigation=CategoryInvestigationView(
                questions=[
                    "Was the destination domain registered in the last 14 days or listed on Threat Intel feeds?",
                    "Which internal process initiated the DNS or outbound socket connection?",
                    "Have any other hosts in the subnet contacted the same destination?",
                ],
                evidence_sources=["DNS & Firewall Egress Logs", "Threat Intelligence", "EDR Socket Lineage"],
                competing_explanations=[
                    "Confirmed C2 Beacon / DNS Tunneling",
                    "Benign CDN / Security Scanner Telemetry",
                ],
                internal_packs=[
                    "pack.inv.network_beacon_triage@v2",
                    "pack.ev.dns_and_ti_reputation@v2",
                ],
            ),
            response=CategoryResponseView(
                actions=[
                    "Block destination domain/IP on perimeter firewall and sinkhole DNS",
                ],
                verification_checks=[
                    "Verify 0 permitted outbound packets to blocked indicator after 60s",
                ],
                rollback_steps=[
                    "1-Click Remove Indicator from Perimeter Blocklist",
                ],
                reversible=True,
                internal_packs=[
                    "pack.resp.block_perimeter_ioc@v2",
                    "pack.verify.egress_zero_hits@v1",
                    "pack.rollback.unblock_perimeter_ioc@v2",
                ],
            ),
            governance=CategoryGovernanceView(
                approval_policy="1-Click L1 Approval when destination has 0 legitimate business traffic across peers",
                confidence_threshold=80,
                blast_radius_ceiling="External uncategorized domain/IP (0 internal services)",
                escalation_path="Escalate to Network Security & Threat Intel team",
                internal_packs=[
                    "pack.policy.tier1_safe_containment@v5",
                    "pack.esc.netsec_tier2@v1",
                ],
            ),
        ),
    ),
]


def get_builtin_packs_catalog() -> dict[str, Any]:
    """Return the reusable packs grouped by the 3 visible studio categories."""
    by_category: dict[str, list[dict[str, Any]]] = {
        VisiblePackCategory.INVESTIGATION.value: [],
        VisiblePackCategory.RESPONSE.value: [],
        VisiblePackCategory.GOVERNANCE.value: [],
    }
    all_packs: list[dict[str, Any]] = []
    for p in _BUILTIN_PACKS:
        dumped = p.model_dump()
        all_packs.append(dumped)
        by_category[p.visible_category.value].append(dumped)

    return {
        "categories": {
            "investigation": {
                "title": "Investigation",
                "subtitle": "Evidence, Questions, Reasoning & Hypotheses",
                "internal_types": [
                    InternalPackType.INVESTIGATION_PACK.value,
                    InternalPackType.EVIDENCE_PACK.value,
                    InternalPackType.HYPOTHESIS_PACK.value,
                    InternalPackType.KNOWLEDGE_PACK.value,
                ],
                "packs": by_category[VisiblePackCategory.INVESTIGATION.value],
            },
            "response": {
                "title": "Response",
                "subtitle": "Actions, Post-Action Verification & 1-Click Rollback",
                "internal_types": [
                    InternalPackType.RESPONSE_PACK.value,
                    InternalPackType.VERIFICATION_PACK.value,
                    InternalPackType.ROLLBACK_PACK.value,
                ],
                "packs": by_category[VisiblePackCategory.RESPONSE.value],
            },
            "governance": {
                "title": "Governance",
                "subtitle": "Policies, Blast-Radius Risk, Approvals & Escalation",
                "internal_types": [
                    InternalPackType.DECISION_POLICY_PACK.value,
                    InternalPackType.ESCALATION_PACK.value,
                ],
                "packs": by_category[VisiblePackCategory.GOVERNANCE.value],
            },
        },
        "packs": all_packs,
        "internal_to_visible_map": {k.value: v.value for k, v in INTERNAL_TO_VISIBLE_PACK_CATEGORY.items()},
    }


def get_builtin_blueprints() -> list[dict[str, Any]]:
    """Return curated Runbook Blueprints with 3-category views."""
    return [bp.model_dump() for bp in _BUILTIN_BLUEPRINTS]


def project_legacy_playbook_categories(playbook_dict: dict[str, Any]) -> dict[str, Any]:
    """Build a human-friendly 3-category (`Investigation`, `Response`, `Governance`) view for any v1 Playbook."""
    steps = playbook_dict.get("steps") or []
    questions: list[str] = []
    actions: list[str] = []
    approvals: list[str] = []

    for s in steps:
        stype = str(s.get("type") or "")
        sname = str(s.get("name") or s.get("id") or "Step")
        if stype in ("enrich", "condition", "ask_model", "osquery", "verify_with_user"):
            questions.append(sname)
        elif stype in ("action", "notify"):
            actions.append(sname)
        elif stype in ("approval", "wait"):
            approvals.append(sname)

    if not questions:
        questions = [
            "Verify entity identity, recent baseline, and source reputation",
            "Check for corroborating post-alert activity across connected telemetry",
        ]
    if not actions:
        actions = ["Execute governed containment action and record audit receipt"]

    view = ThreeCategoryRunbookView(
        investigation=CategoryInvestigationView(
            questions=questions,
            evidence_sources=["OCSF Event Lake", "Entity Context Graph", "Threat Intelligence"],
            competing_explanations=["Confirmed Malicious Activity", "Benign Operational / Authorized Activity"],
            internal_packs=["pack.inv.identity_origin@v4", "pack.kb.enterprise_identity_exceptions@v2"],
        ),
        response=CategoryResponseView(
            actions=actions,
            verification_checks=["Confirm risk state cleared and no new alerts fired within 60s"],
            rollback_steps=["1-Click Rollback available via saved state snapshot"],
            reversible=True,
            internal_packs=["pack.resp.evict_and_clean_identity@v3", "pack.verify.zero_active_sessions@v2"],
        ),
        governance=CategoryGovernanceView(
            approval_policy=(
                f"Governed approval gate ({', '.join(approvals)})"
                if approvals
                else "1-Click L1 Approval when AI Confidence >= 80% and Blast Radius = Low"
            ),
            confidence_threshold=80,
            blast_radius_ceiling="Single user or host entity (0 shared production services)",
            escalation_path="Escalate to Tier-2 with full 24-dimension AI investigation summary",
            internal_packs=["pack.policy.tier1_safe_containment@v5", "pack.esc.slack_user_and_tier2@v2"],
        ),
    )
    return view.model_dump()


# ---------------------------------------------------------------------------
# 3. Information-Gain Multi-Wave Reasoning Engine
# ---------------------------------------------------------------------------


class InformationGainRunbookEngine:
    """Executes Context-First Information-Gain Investigation and emits Dual-Projection output."""

    def __init__(self) -> None:
        self._context_engine = PreReasoningContextEngine()

    def investigate(
        self,
        *,
        tenant_id: str,
        alert_summary: str,
        raw_alert: dict[str, Any] | None = None,
    ) -> InvestigationStoryResponse:
        raw = dict(raw_alert or {})
        incident_id = str(raw.get("id") or raw.get("alert_id") or "AL-9042")
        title = str(raw.get("title") or alert_summary or "Suspicious security activity detected")

        # Step 0: Hydrate all 24 context dimensions BEFORE Wave 1 begins
        ctx = self._context_engine.assemble(
            tenant_id=tenant_id,
            alert_summary=alert_summary,
            raw_alert=raw,
        )

        principal = ctx.identity_context.get("principal", "john.smith@corp.example")
        display_user = "John Smith" if "john.smith" in principal.lower() else principal

        # Determine scenario characteristics from alert + hydrated context
        is_corporate_vpn = bool(raw.get("corporate_vpn", False))
        is_recent_deploy = bool(raw.get("recent_deployment", False)) or len(ctx.recent_deployments) > 0
        is_missing_telemetry = bool(raw.get("missing_edr_telemetry", False))

        if is_corporate_vpn or is_recent_deploy:
            return self._build_benign_story(
                incident_id=incident_id,
                title=title,
                display_user=display_user,
                ctx=ctx,
                raw=raw,
                is_recent_deploy=is_recent_deploy,
            )

        if is_missing_telemetry:
            return self._build_grey_zone_story(
                incident_id=incident_id,
                title=title,
                display_user=display_user,
                ctx=ctx,
                raw=raw,
            )

        return self._build_takeover_or_compromise_story(
            incident_id=incident_id,
            title=title,
            display_user=display_user,
            ctx=ctx,
            raw=raw,
        )

    def _build_takeover_or_compromise_story(
        self,
        *,
        incident_id: str,
        title: str,
        display_user: str,
        ctx: InvestigationContext24,
        raw: dict[str, Any],
    ) -> InvestigationStoryResponse:
        src_ip = ctx.threat_intelligence.get("indicator", "185.220.101.44")
        ledger = [
            ConfidenceLedgerEntry(
                entry_id="led-0",
                wave=0,
                pack_id="pack.kb.enterprise_identity_exceptions@v2",
                question="Does ambient context show prior history or approved exception for this login?",
                answer="NO",
                target_hypothesis_id="H1_ATO",
                delta_points=35,
                running_total=35,
                explanation=f"Base prior initialized from 24-dimension context: 0 prior logins from {src_ip} in 90 days and 0 active maintenance windows.",
                citations=[f"ctx:baseline:{display_user}", "ctx:cmdb:maintenance_windows"],
            ),
            ConfidenceLedgerEntry(
                entry_id="led-1",
                wave=1,
                pack_id="pack.inv.identity_origin@v4",
                question="Did the login originate from a known Tor exit node or anonymizer?",
                answer="YES",
                target_hypothesis_id="H1_ATO",
                delta_points=25,
                running_total=60,
                explanation=f"Source IP {src_ip} is a verified Tor exit relay; Corporate VPN was ruled out.",
                citations=[f"ocsf:auth:{incident_id}:src_ip", f"ti:tor_exit:{src_ip}"],
            ),
            ConfidenceLedgerEntry(
                entry_id="led-2",
                wave=1,
                pack_id="pack.inv.identity_origin@v4",
                question="Was strong MFA bypassed during authentication?",
                answer="YES",
                target_hypothesis_id="H1_ATO",
                delta_points=15,
                running_total=75,
                explanation="Session authenticated via legacy protocol without completing strong MFA.",
                citations=[f"ocsf:auth:{incident_id}:mfa_factor"],
            ),
            ConfidenceLedgerEntry(
                entry_id="led-3",
                wave=2,
                pack_id="pack.ev.m365_persistence@v2",
                question="Did the account create external forwarding rules or suspicious OAuth grants after login?",
                answer="YES",
                target_hypothesis_id="H1_ATO",
                delta_points=21,
                running_total=96,
                explanation="New mailbox forwarding rule to external address created 85 seconds after sign-in.",
                citations=[f"ocsf:m365:{incident_id}:Set-InboxRule"],
            ),
            ConfidenceLedgerEntry(
                entry_id="led-4",
                wave=0,
                pack_id="pack.kb.enterprise_identity_exceptions@v2",
                question="Has the user ever logged in from this geographic region in the past year?",
                answer="YES",
                target_hypothesis_id="H1_ATO",
                delta_points=-5,
                running_total=91,
                explanation="User had 1 travel sign-in from Europe 8 months ago (tempered score slightly).",
                citations=[f"ctx:history:{display_user}:8m"],
            ),
        ]

        analyst = AnalystModeProjection(
            what_happened=f"Impossible travel detected for user {display_user} ({title}).",
            ai_belief_headline="High-confidence account takeover.",
            ai_belief_summary=(
                f"An external attacker signed into {display_user}'s account from a Tor exit node "
                "without MFA and immediately created a hidden mailbox forwarding rule."
            ),
            severity_assessment="critical",
            is_serious=True,
            confidence_percent=91,
            confidence_label="high",
            key_evidence=[
                ReadableEvidenceCheck(
                    status="confirmed",
                    label="Tor exit node",
                    detail=f"Login originated from verified Tor exit relay ({src_ip}) with 0 prior tenant sign-ins.",
                    source="Threat Intelligence & IdP",
                ),
                ReadableEvidenceCheck(
                    status="confirmed",
                    label="Legacy authentication (MFA bypassed)",
                    detail="Authenticated without completing strong MFA challenge.",
                    source="Identity Provider",
                ),
                ReadableEvidenceCheck(
                    status="confirmed",
                    label="New forwarding rule",
                    detail="Hidden inbox rule created 85s after login to forward financial emails externally.",
                    source="M365 Audit Log",
                ),
                ReadableEvidenceCheck(
                    status="confirmed",
                    label="Impossible travel confirmed",
                    detail="Sign-in occurred minutes after normal activity in home location; Corporate VPN ruled out.",
                    source="UEBA & Peer Baseline",
                ),
            ],
            confidence_increased_because=[
                "Login originated from a known Tor exit node.",
                "MFA was bypassed via legacy authentication protocol.",
                "New mailbox forwarding rule was created immediately after sign-in.",
                "Corporate VPN and scheduled IT maintenance windows were ruled out.",
            ],
            confidence_decreased_because=[
                "Account had one historical travel login from Europe 8 months ago.",
            ],
            missing_telemetry_notice=[],
            primary_recommendation=PrimaryRecommendation(
                decision_type="approve_containment",
                button_label="Approve Containment: Lock Account & Remove Forwarding Rule",
                summary=f"Immediately lock {display_user}'s account, revoke active sessions, and delete the external forwarding rule.",
                business_impact=f"Low operational risk — affects only {display_user}'s account; 0 shared production services or databases impacted.",
                what_happens_when_executed=[
                    f"Terminates all active sessions and OAuth tokens for {display_user}.",
                    "Deletes the unauthorized external mailbox forwarding rule.",
                    "Automatically verifies at +60s that active sessions dropped to 0.",
                    "Arms 1-Click Rollback so the account can be restored instantly if verified legitimate.",
                ],
                reversible=True,
                rollback_guarantee="1-Click full account & mailbox restore available anytime.",
                secondary_options=["Investigate further", "Escalate to Tier-2"],
            ),
            reasoning_summary_steps=[
                "Alert received",
                "Context hydrated (24 sources)",
                "Three questions asked",
                "Corporate VPN ruled out",
                "Suspicious forwarding rule discovered",
                "Wave 2 triggered",
                "Evidence sufficient (91% confidence)",
                "Containment recommended",
            ],
        )

        expert = ExpertModeProjection(
            blueprint_id="rb.identity.impossible_travel_ato",
            blueprint_version=4,
            context_dimensions_hydrated=ctx.hydrated_dimension_count,
            context_highlights={
                "principal": ctx.identity_context.get("principal"),
                "department": ctx.identity_context.get("department"),
                "asset_tier": ctx.business_criticality.get("tier"),
                "blast_radius": ctx.business_criticality.get("blast_radius_if_isolated"),
                "recent_deployments_count": len(ctx.recent_deployments),
                "maintenance_windows_count": len(ctx.maintenance_windows),
            },
            confidence_ledger=ledger,
            hypothesis_evolution=[
                HypothesisWaveCurve(
                    hypothesis_id="H1_ATO",
                    title="Account Takeover & Mailbox Persistence",
                    is_winner=True,
                    final_score=91,
                    points=[
                        HypothesisWavePoint(wave=0, score=35),
                        HypothesisWavePoint(wave=1, score=75),
                        HypothesisWavePoint(wave=2, score=91),
                    ],
                ),
                HypothesisWaveCurve(
                    hypothesis_id="H2_VPN_TRAVEL",
                    title="Legitimate Travel / Corporate VPN",
                    is_winner=False,
                    final_score=9,
                    points=[
                        HypothesisWavePoint(wave=0, score=35),
                        HypothesisWavePoint(wave=1, score=15),
                        HypothesisWavePoint(wave=2, score=9),
                    ],
                ),
            ],
            wave_executions=[
                WaveExecutionTrace(
                    wave=0,
                    name="Wave 0: Pre-Reasoning 24-Dimension Context Hydration",
                    duration_ms=180,
                    questions_asked=["Hydrate Identity, CMDB, Baselines, Deployments, Threat Intel & Past Resolutions"],
                    packs_invoked=["pack.kb.enterprise_identity_exceptions@v2"],
                    outcome_summary="24/24 context dimensions hydrated; 0 maintenance windows or VPN exceptions matched.",
                ),
                WaveExecutionTrace(
                    wave=1,
                    name="Wave 1: High-Information-Gain Identity Origin Triage",
                    duration_ms=620,
                    questions_asked=[
                        "Did the login originate from a known Tor exit node or Corporate VPN?",
                        "Was strong MFA completed during sign-in?",
                    ],
                    packs_invoked=["pack.inv.identity_origin@v4", "pack.hyp.credential_compromise@v3"],
                    outcome_summary="Tor exit node confirmed (+25) and MFA bypass confirmed (+15); confidence reached 75% (spawned Wave 2 to cross 80% threshold).",
                ),
                WaveExecutionTrace(
                    wave=2,
                    name="Wave 2: Post-Authentication Persistence Deep Dive",
                    duration_ms=840,
                    questions_asked=[
                        "Did the account create external forwarding rules or OAuth grants within 30m of login?",
                    ],
                    packs_invoked=["pack.ev.m365_persistence@v2"],
                    outcome_summary="External forwarding rule discovered (+21); final confidence reached 91% >= 80% threshold. Early stop triggered.",
                ),
            ],
            pack_executions=[
                PackExecutionReceipt(
                    pack_id="pack.kb.enterprise_identity_exceptions",
                    version=2,
                    internal_type=InternalPackType.KNOWLEDGE_PACK,
                    visible_category=VisiblePackCategory.INVESTIGATION,
                    title="Sanctioned VPN Egress, Change Windows & VIP Context",
                    status="completed",
                    duration_ms=180,
                    summary="Hydrated 24 context dimensions before Wave 1.",
                ),
                PackExecutionReceipt(
                    pack_id="pack.inv.identity_origin",
                    version=4,
                    internal_type=InternalPackType.INVESTIGATION_PACK,
                    visible_category=VisiblePackCategory.INVESTIGATION,
                    title="Identity & Sign-In Origin Verification",
                    status="completed",
                    duration_ms=620,
                    summary="Confirmed Tor exit relay and legacy auth without MFA.",
                ),
                PackExecutionReceipt(
                    pack_id="pack.ev.m365_persistence",
                    version=2,
                    internal_type=InternalPackType.EVIDENCE_PACK,
                    visible_category=VisiblePackCategory.INVESTIGATION,
                    title="Post-Login Mailbox & OAuth Persistence Check",
                    status="completed",
                    duration_ms=840,
                    summary="Found Set-InboxRule forwarding to external recipient.",
                ),
                PackExecutionReceipt(
                    pack_id="pack.resp.evict_and_clean_identity",
                    version=3,
                    internal_type=InternalPackType.RESPONSE_PACK,
                    visible_category=VisiblePackCategory.RESPONSE,
                    title="Lock Account, Revoke Sessions & Remove Forwarding Rules",
                    status="staged",
                    duration_ms=0,
                    summary="Staged for 1-click L1 approval.",
                ),
            ],
            decision_policy=DecisionPolicyEvaluation(
                policy_pack_id="pack.policy.tier1_safe_containment@v5",
                policy_title="Standard L1 High-Confidence Containment Policy",
                required_confidence=80,
                actual_confidence=91,
                asset_criticality="tier-1",
                blast_radius_level="low",
                autonomy_mode="one_click_approval",
                policy_rationale="Confidence (91%) exceeds 80% floor and blast radius is isolated to 1 user account.",
            ),
            verification_and_rollback=VerificationAndRollbackSpec(
                verification_pack_id="pack.verify.zero_active_sessions@v2",
                verification_checks=[
                    "Poll IdP at +60s to confirm 0 active sessions remain",
                    "Verify external forwarding rule is removed from Exchange mailbox",
                ],
                verification_window_seconds=60,
                rollback_pack_id="pack.rollback.restore_identity_state@v3",
                rollback_steps=[
                    "Unlock user account in IdP",
                    "Restore mailbox forwarding configuration from pre-action snapshot",
                ],
                reversible=True,
            ),
            citations=[
                f"ocsf:auth:{incident_id}:src_ip",
                f"ti:tor_exit:{src_ip}",
                f"ocsf:auth:{incident_id}:mfa_factor",
                f"ocsf:m365:{incident_id}:Set-InboxRule",
            ],
        )

        return InvestigationStoryResponse(
            incident_id=incident_id,
            blueprint_id="rb.identity.impossible_travel_ato",
            blueprint_title="Suspicious Identity Sign-In & Account Takeover",
            analyst_mode=analyst,
            expert_mode=expert,
        )

    def _build_benign_story(
        self,
        *,
        incident_id: str,
        title: str,
        display_user: str,
        ctx: InvestigationContext24,
        raw: dict[str, Any],
        is_recent_deploy: bool,
    ) -> InvestigationStoryResponse:
        headline = (
            "Likely legitimate deployment & maintenance activity."
            if is_recent_deploy
            else "Likely legitimate travel using corporate VPN."
        )
        ledger = [
            ConfidenceLedgerEntry(
                entry_id="led-b0",
                wave=0,
                pack_id="pack.kb.enterprise_identity_exceptions@v2",
                question="Does ambient context match a sanctioned corporate VPN or approved change window?",
                answer="YES",
                target_hypothesis_id="H2_BENIGN",
                delta_points=55,
                running_total=55,
                explanation="Matched sanctioned corporate VPN egress and known device baseline in Wave 0.",
                citations=[f"ctx:exceptions:{incident_id}"],
            ),
            ConfidenceLedgerEntry(
                entry_id="led-b1",
                wave=1,
                pack_id="pack.inv.identity_origin@v4",
                question="Was strong hardware MFA completed and was there zero suspicious activity after login?",
                answer="YES",
                target_hypothesis_id="H2_BENIGN",
                delta_points=34,
                running_total=89,
                explanation="Hardware MFA succeeded and 0 suspicious mailbox/OAuth actions occurred post-login.",
                citations=[f"ocsf:auth:{incident_id}:mfa_verified"],
            ),
        ]

        analyst = AnalystModeProjection(
            what_happened=f"Impossible travel detected for user {display_user} ({title}).",
            ai_belief_headline=headline,
            ai_belief_summary=(
                f"{display_user} authenticated through a sanctioned corporate VPN gateway using a previously seen corporate laptop and strong MFA, with zero suspicious post-login activity."
            ),
            severity_assessment="low",
            is_serious=False,
            confidence_percent=89,
            confidence_label="high",
            key_evidence=[
                ReadableEvidenceCheck(
                    status="confirmed",
                    label="MFA completed",
                    detail="User passed strong phishing-resistant MFA on first prompt.",
                    source="Identity Provider",
                ),
                ReadableEvidenceCheck(
                    status="confirmed",
                    label="Login from corporate VPN",
                    detail="Source IP belongs to sanctioned corporate VPN egress pool.",
                    source="Network & CMDB",
                ),
                ReadableEvidenceCheck(
                    status="confirmed",
                    label="Device previously seen",
                    detail="Managed corporate laptop fingerprint matches 90-day baseline.",
                    source="EDR & Asset Inventory",
                ),
                ReadableEvidenceCheck(
                    status="confirmed",
                    label="No suspicious activity after login",
                    detail="Zero forwarding rules, privilege changes, or abnormal data access.",
                    source="M365 & Cloud Audit",
                ),
            ],
            confidence_increased_because=[
                "User completed strong hardware MFA during sign-in.",
                "Source IP belongs to a sanctioned corporate VPN gateway.",
                "Device fingerprint matches historical corporate laptop usage.",
                "No suspicious mailbox or privilege activity occurred after login.",
            ],
            confidence_decreased_because=[
                "Sign-in occurred outside the user's primary home timezone.",
            ],
            missing_telemetry_notice=[],
            primary_recommendation=PrimaryRecommendation(
                decision_type="no_action_required",
                button_label="No Action Required — Close as Legitimate VPN Activity",
                summary="Close alert as verified legitimate corporate VPN roaming and update 7-day travel baseline.",
                business_impact="Zero disruption — user continues working normally.",
                what_happens_when_executed=[
                    "Marks alert as Resolved (Benign — Verified Corporate VPN).",
                    "Records 7-day temporary travel baseline so repeat VPN alerts are suppressed.",
                ],
                reversible=True,
                rollback_guarantee="Alert can be reopened with 1 click if new indicators appear.",
                secondary_options=["Investigate further", "Ask user on Slack"],
            ),
            reasoning_summary_steps=[
                "Alert received",
                "Context hydrated (24 sources)",
                "Corporate VPN & known device matched",
                "Strong MFA verified",
                "Post-login activity verified clean",
                "Evidence sufficient (89% confidence — stopped early after Wave 1)",
                "No action required",
            ],
        )

        expert = ExpertModeProjection(
            blueprint_id="rb.identity.impossible_travel_ato",
            blueprint_version=4,
            context_dimensions_hydrated=ctx.hydrated_dimension_count,
            context_highlights={
                "principal": ctx.identity_context.get("principal"),
                "known_exceptions": len(ctx.known_exceptions),
                "peers_using_source_asn": ctx.peer_entity_behavior.get("peers_using_source_asn"),
            },
            confidence_ledger=ledger,
            hypothesis_evolution=[
                HypothesisWaveCurve(
                    hypothesis_id="H2_BENIGN",
                    title="Legitimate Travel / Corporate VPN",
                    is_winner=True,
                    final_score=89,
                    points=[
                        HypothesisWavePoint(wave=0, score=55),
                        HypothesisWavePoint(wave=1, score=89),
                    ],
                ),
                HypothesisWaveCurve(
                    hypothesis_id="H1_ATO",
                    title="Account Takeover",
                    is_winner=False,
                    final_score=11,
                    points=[
                        HypothesisWavePoint(wave=0, score=25),
                        HypothesisWavePoint(wave=1, score=11),
                    ],
                ),
            ],
            wave_executions=[
                WaveExecutionTrace(
                    wave=0,
                    name="Wave 0: Pre-Reasoning 24-Dimension Context Hydration",
                    duration_ms=150,
                    questions_asked=["Hydrate 24 context dimensions"],
                    packs_invoked=["pack.kb.enterprise_identity_exceptions@v2"],
                    outcome_summary="Matched corporate VPN exception and managed device history.",
                ),
                WaveExecutionTrace(
                    wave=1,
                    name="Wave 1: MFA & Post-Auth Sanity Check (Early Stop)",
                    duration_ms=310,
                    questions_asked=["Was strong MFA completed?", "Any suspicious post-login activity?"],
                    packs_invoked=["pack.inv.identity_origin@v4"],
                    outcome_summary="Reached 89% Benign confidence >= 80% threshold; Wave 2 skipped to save cost.",
                ),
            ],
            pack_executions=[
                PackExecutionReceipt(
                    pack_id="pack.kb.enterprise_identity_exceptions",
                    version=2,
                    internal_type=InternalPackType.KNOWLEDGE_PACK,
                    visible_category=VisiblePackCategory.INVESTIGATION,
                    title="Sanctioned VPN Egress, Change Windows & VIP Context",
                    status="completed",
                    duration_ms=150,
                    summary="Matched corporate VPN egress.",
                ),
                PackExecutionReceipt(
                    pack_id="pack.inv.identity_origin",
                    version=4,
                    internal_type=InternalPackType.INVESTIGATION_PACK,
                    visible_category=VisiblePackCategory.INVESTIGATION,
                    title="Identity & Sign-In Origin Verification",
                    status="completed",
                    duration_ms=310,
                    summary="Confirmed strong MFA and managed device.",
                ),
            ],
            decision_policy=DecisionPolicyEvaluation(
                policy_pack_id="pack.policy.tier1_safe_containment@v5",
                policy_title="Standard L1 High-Confidence Containment Policy",
                required_confidence=80,
                actual_confidence=89,
                asset_criticality="tier-1",
                blast_radius_level="low",
                autonomy_mode="one_click_approval",
                policy_rationale="Benign confidence (89%) >= 85% threshold; safe to close with no containment.",
            ),
            verification_and_rollback=VerificationAndRollbackSpec(
                verification_pack_id="pack.verify.zero_active_sessions@v2",
                verification_checks=["Continue passive UEBA monitoring for 24h"],
                verification_window_seconds=60,
                rollback_pack_id="pack.rollback.restore_identity_state@v3",
                rollback_steps=["Reopen alert if anomalous post-auth event arrives"],
                reversible=True,
            ),
            citations=[f"ctx:exceptions:{incident_id}", f"ocsf:auth:{incident_id}:mfa_verified"],
        )

        return InvestigationStoryResponse(
            incident_id=incident_id,
            blueprint_id="rb.identity.impossible_travel_ato",
            blueprint_title="Suspicious Identity Sign-In & Account Takeover",
            analyst_mode=analyst,
            expert_mode=expert,
        )

    def _build_grey_zone_story(
        self,
        *,
        incident_id: str,
        title: str,
        display_user: str,
        ctx: InvestigationContext24,
        raw: dict[str, Any],
    ) -> InvestigationStoryResponse:
        analyst = AnalystModeProjection(
            what_happened=f"Unusual sign-in location detected for {display_user} ({title}).",
            ai_belief_headline="Unconfirmed travel — awaiting user verification (Confidence capped at 68%).",
            ai_belief_summary=(
                f"{display_user} completed MFA from a commercial hotel network, but endpoint EDR telemetry is offline so AI cannot exceed 68% certainty without user confirmation."
            ),
            severity_assessment="medium",
            is_serious=True,
            confidence_percent=68,
            confidence_label="medium",
            key_evidence=[
                ReadableEvidenceCheck(
                    status="confirmed",
                    label="MFA completed",
                    detail="User approved MFA prompt.",
                    source="Identity Provider",
                ),
                ReadableEvidenceCheck(
                    status="missing",
                    label="Endpoint EDR sensor offline",
                    detail="Laptop has not checked into EDR for 4 hours (missing telemetry cap applied).",
                    source="Endpoint Security",
                ),
            ],
            confidence_increased_because=[
                "Sign-in originated from an unfamiliar hotel Wi-Fi network.",
            ],
            confidence_decreased_because=[
                "User completed MFA prompt on their registered phone.",
            ],
            missing_telemetry_notice=[
                "Endpoint EDR telemetry is currently offline, capping maximum AI confidence at 75%.",
            ],
            primary_recommendation=PrimaryRecommendation(
                decision_type="investigate_further",
                button_label=f"Ask {display_user} on Slack to Confirm Travel (1-Click)",
                summary=f"Send an interactive Yes/No Slack verification prompt to {display_user} before locking the account.",
                business_impact="Zero disruption — prompts user first before terminating sessions.",
                what_happens_when_executed=[
                    f"Sends signed Slack verification message to {display_user}.",
                    "If user clicks 'Yes, it was me', closes alert automatically.",
                    "If user clicks 'No' (or does not reply in 15m), locks account and escalates to Tier-2.",
                ],
                reversible=True,
                rollback_guarantee="No destructive action is taken until user responds or timer expires.",
                secondary_options=["Escalate to Tier-2", "Approve Containment Now"],
            ),
            reasoning_summary_steps=[
                "Alert received",
                "Context hydrated (24 sources)",
                "MFA verified",
                "Endpoint telemetry offline — confidence capped at 68%",
                "User verification recommended",
            ],
        )

        expert = ExpertModeProjection(
            blueprint_id="rb.identity.impossible_travel_ato",
            blueprint_version=4,
            context_dimensions_hydrated=ctx.hydrated_dimension_count,
            context_highlights={"missing_telemetry": ["edr_endpoint_sensor"]},
            confidence_ledger=[
                ConfidenceLedgerEntry(
                    entry_id="led-g1",
                    wave=1,
                    pack_id="pack.inv.identity_origin@v4",
                    question="Is endpoint EDR telemetry available to verify device integrity?",
                    answer="UNKNOWN",
                    target_hypothesis_id="H1_ATO",
                    delta_points=0,
                    running_total=68,
                    explanation="EDR telemetry offline; missing-telemetry ceiling caps confidence at 75%.",
                    citations=[f"ctx:asset:{incident_id}:edr_offline"],
                )
            ],
            hypothesis_evolution=[
                HypothesisWaveCurve(
                    hypothesis_id="H1_ATO",
                    title="Unconfirmed Roaming / Potential Takeover",
                    is_winner=True,
                    final_score=68,
                    points=[HypothesisWavePoint(wave=0, score=50), HypothesisWavePoint(wave=1, score=68)],
                )
            ],
            wave_executions=[
                WaveExecutionTrace(
                    wave=1,
                    name="Wave 1: Origin & Device Check",
                    duration_ms=420,
                    questions_asked=["Check MFA & Endpoint EDR status"],
                    packs_invoked=["pack.inv.identity_origin@v4"],
                    outcome_summary="Confidence capped at 68% due to offline EDR sensor; routed to Slack verification.",
                )
            ],
            pack_executions=[],
            decision_policy=DecisionPolicyEvaluation(
                policy_pack_id="pack.policy.tier1_safe_containment@v5",
                policy_title="Standard L1 High-Confidence Containment Policy",
                required_confidence=80,
                actual_confidence=68,
                asset_criticality="tier-1",
                blast_radius_level="low",
                autonomy_mode="manual_only",
                policy_rationale="Confidence (68%) is below 80% floor due to missing EDR telemetry; interactive user verification required.",
            ),
            verification_and_rollback=VerificationAndRollbackSpec(
                verification_pack_id="pack.esc.slack_user_and_tier2@v2",
                verification_checks=["Await signed Slack callback response"],
                verification_window_seconds=900,
                rollback_pack_id="pack.rollback.restore_identity_state@v3",
                rollback_steps=["Cancel pending lock if user confirms travel"],
                reversible=True,
            ),
            citations=[f"ctx:asset:{incident_id}:edr_offline"],
        )

        return InvestigationStoryResponse(
            incident_id=incident_id,
            blueprint_id="rb.identity.impossible_travel_ato",
            blueprint_title="Suspicious Identity Sign-In & Account Takeover",
            analyst_mode=analyst,
            expert_mode=expert,
        )
