"""Data models for the Context-First Composable Runbook & Human-Story Investigation Engine.

Implements the Dual-Projection Contract:
1. ``AnalystModeProjection`` (Default UI):
   - Built for SOC L1, Junior SOC, NOC, and SRE L1 operators (30-45s comprehension).
   - Answers the 6 progressive-disclosure questions in strict order:
     1. What happened?
     2. Is this serious? (What does AI believe happened?)
     3. Why does AI think this?
     4. What evidence supports it?
     5. What should I do?
     6. What happens if I execute this action?
   - Includes the audit-friendly AI Investigation Summary chain.
   - Exposes zero internal AI math (+25/-15), wave mechanics, or pack IDs.

2. ``ExpertModeProjection`` (Expandable Forensic UI):
   - Exposes the numerical Confidence Ledger, Hypothesis Evolution across waves,
     Wave & Pack execution traces, 24-Dimension Context Bundle summary, Decision
     Policy evaluation, Verification specs, Rollback specs, and OCSF citations.

3. ``VisiblePackCategory`` vs ``InternalPackType``:
   - Preserves all 9 modular internal pack types for enterprise engineering scale
     while grouping them into 3 intuitive visible categories (`investigation`,
     `response`, `governance`) in the UI.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Pack Taxonomy: 9 Internal Pack Types -> 3 Visible Studio Categories
# ---------------------------------------------------------------------------


class VisiblePackCategory(StrEnum):
    INVESTIGATION = "investigation"
    RESPONSE = "response"
    GOVERNANCE = "governance"


class InternalPackType(StrEnum):
    # Investigation category (4 internal types)
    INVESTIGATION_PACK = "investigation_pack"
    EVIDENCE_PACK = "evidence_pack"
    HYPOTHESIS_PACK = "hypothesis_pack"
    KNOWLEDGE_PACK = "knowledge_pack"
    # Response category (3 internal types)
    RESPONSE_PACK = "response_pack"
    VERIFICATION_PACK = "verification_pack"
    ROLLBACK_PACK = "rollback_pack"
    # Governance category (2 internal types)
    DECISION_POLICY_PACK = "decision_policy_pack"
    ESCALATION_PACK = "escalation_pack"


INTERNAL_TO_VISIBLE_PACK_CATEGORY: dict[InternalPackType, VisiblePackCategory] = {
    InternalPackType.INVESTIGATION_PACK: VisiblePackCategory.INVESTIGATION,
    InternalPackType.EVIDENCE_PACK: VisiblePackCategory.INVESTIGATION,
    InternalPackType.HYPOTHESIS_PACK: VisiblePackCategory.INVESTIGATION,
    InternalPackType.KNOWLEDGE_PACK: VisiblePackCategory.INVESTIGATION,
    InternalPackType.RESPONSE_PACK: VisiblePackCategory.RESPONSE,
    InternalPackType.VERIFICATION_PACK: VisiblePackCategory.RESPONSE,
    InternalPackType.ROLLBACK_PACK: VisiblePackCategory.RESPONSE,
    InternalPackType.DECISION_POLICY_PACK: VisiblePackCategory.GOVERNANCE,
    InternalPackType.ESCALATION_PACK: VisiblePackCategory.GOVERNANCE,
}


# ---------------------------------------------------------------------------
# Pre-Reasoning 24-Dimension Investigation Context Bundle
# ---------------------------------------------------------------------------

EXPECTED_24_CONTEXT_DIMENSIONS: tuple[str, ...] = (
    "identity_context",
    "asset_context",
    "cmdb",
    "topology",
    "ownership",
    "business_criticality",
    "recent_deployments",
    "maintenance_windows",
    "historical_similar_alerts",
    "past_resolutions",
    "false_positive_history",
    "threat_intelligence",
    "mitre_context",
    "related_incidents",
    "current_active_alerts",
    "detection_metadata",
    "entity_relationships",
    "historical_baselines",
    "seasonality",
    "behavioral_baselines",
    "known_exceptions",
    "compliance_tags",
    "risk_score",
    "recent_changes",
    "peer_entity_behavior",
)


class InvestigationContext24(BaseModel):
    """Comprehensive pre-reasoning context bundle assembled before Wave 1."""

    identity_context: dict[str, Any] = Field(default_factory=dict)
    asset_context: dict[str, Any] = Field(default_factory=dict)
    cmdb: dict[str, Any] = Field(default_factory=dict)
    topology: dict[str, Any] = Field(default_factory=dict)
    ownership: dict[str, Any] = Field(default_factory=dict)
    business_criticality: dict[str, Any] = Field(default_factory=dict)
    recent_deployments: list[dict[str, Any]] = Field(default_factory=list)
    maintenance_windows: list[dict[str, Any]] = Field(default_factory=list)
    historical_similar_alerts: list[dict[str, Any]] = Field(default_factory=list)
    past_resolutions: list[dict[str, Any]] = Field(default_factory=list)
    false_positive_history: dict[str, Any] = Field(default_factory=dict)
    threat_intelligence: dict[str, Any] = Field(default_factory=dict)
    mitre_context: list[dict[str, Any]] = Field(default_factory=list)
    related_incidents: list[dict[str, Any]] = Field(default_factory=list)
    current_active_alerts: list[dict[str, Any]] = Field(default_factory=list)
    detection_metadata: dict[str, Any] = Field(default_factory=dict)
    entity_relationships: list[dict[str, Any]] = Field(default_factory=list)
    historical_baselines: dict[str, Any] = Field(default_factory=dict)
    seasonality: dict[str, Any] = Field(default_factory=dict)
    behavioral_baselines: dict[str, Any] = Field(default_factory=dict)
    known_exceptions: list[dict[str, Any]] = Field(default_factory=list)
    compliance_tags: list[str] = Field(default_factory=list)
    risk_score: int = 50
    recent_changes: list[dict[str, Any]] = Field(default_factory=list)
    peer_entity_behavior: dict[str, Any] = Field(default_factory=dict)

    @property
    def hydrated_dimension_count(self) -> int:
        return len(EXPECTED_24_CONTEXT_DIMENSIONS)


# ---------------------------------------------------------------------------
# Analyst Mode Projection (Default Human Story View)
# ---------------------------------------------------------------------------


class ReadableEvidenceCheck(BaseModel):
    """Human-readable evidence line shown with a ✔ / ✕ / ? indicator in Analyst Mode."""

    status: Literal["confirmed", "ruled_out", "missing"] = "confirmed"
    label: str
    detail: str = ""
    source: str = ""


class PrimaryRecommendation(BaseModel):
    """Single primary action recommendation + what happens when executed."""

    decision_type: Literal[
        "approve_containment",
        "investigate_further",
        "escalate",
        "no_action_required",
    ]
    button_label: str
    summary: str
    business_impact: str
    what_happens_when_executed: list[str] = Field(default_factory=list)
    reversible: bool = True
    rollback_guarantee: str = "1-Click full restore available if activity is confirmed legitimate."
    secondary_options: list[str] = Field(default_factory=list)


class AnalystModeProjection(BaseModel):
    """Default progressive-disclosure projection for SOC L1 / NOC / SRE L1 operators."""

    # 1. What happened?
    what_happened: str
    # 2. Is this serious? / What does AI believe happened?
    ai_belief_headline: str
    ai_belief_summary: str
    severity_assessment: Literal["critical", "high", "medium", "low", "info"] = "high"
    is_serious: bool = True
    confidence_percent: int = Field(ge=0, le=100)
    confidence_label: Literal["high", "medium", "low"] = "high"
    # 3 & 4. Why does AI think this? & What evidence supports it?
    key_evidence: list[ReadableEvidenceCheck] = Field(default_factory=list)
    confidence_increased_because: list[str] = Field(default_factory=list)
    confidence_decreased_because: list[str] = Field(default_factory=list)
    missing_telemetry_notice: list[str] = Field(default_factory=list)
    # 5 & 6. What should I do? & What happens if I execute this action?
    primary_recommendation: PrimaryRecommendation
    # Audit-friendly reasoning summary (NOT raw chain-of-thought)
    reasoning_summary_steps: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Expert Mode Projection (On-Demand Forensic & Engine Provenance)
# ---------------------------------------------------------------------------


class ConfidenceLedgerEntry(BaseModel):
    """Numerical ledger entry visible in Expert Mode."""

    entry_id: str
    wave: int
    pack_id: str
    question: str
    answer: Literal["YES", "NO", "UNKNOWN"]
    target_hypothesis_id: str
    delta_points: int
    running_total: int
    explanation: str
    citations: list[str] = Field(default_factory=list)


class HypothesisWavePoint(BaseModel):
    wave: int
    score: int


class HypothesisWaveCurve(BaseModel):
    hypothesis_id: str
    title: str
    is_winner: bool = False
    final_score: int
    points: list[HypothesisWavePoint] = Field(default_factory=list)


class WaveExecutionTrace(BaseModel):
    wave: int
    name: str
    duration_ms: int
    questions_asked: list[str] = Field(default_factory=list)
    packs_invoked: list[str] = Field(default_factory=list)
    outcome_summary: str


class PackExecutionReceipt(BaseModel):
    pack_id: str
    version: int = 1
    internal_type: InternalPackType
    visible_category: VisiblePackCategory
    title: str
    status: Literal["completed", "skipped", "staged"] = "completed"
    duration_ms: int = 45
    summary: str = ""


class DecisionPolicyEvaluation(BaseModel):
    policy_pack_id: str
    policy_title: str
    required_confidence: int = 80
    actual_confidence: int
    asset_criticality: str = "tier-1"
    blast_radius_level: Literal["low", "medium", "high"] = "low"
    autonomy_mode: Literal["auto_execute", "one_click_approval", "dual_approval", "manual_only"] = (
        "one_click_approval"
    )
    policy_rationale: str


class VerificationAndRollbackSpec(BaseModel):
    verification_pack_id: str
    verification_checks: list[str] = Field(default_factory=list)
    verification_window_seconds: int = 60
    rollback_pack_id: str
    rollback_steps: list[str] = Field(default_factory=list)
    reversible: bool = True


class ExpertModeProjection(BaseModel):
    """Full forensic provenance revealed when an analyst toggles Expert Mode."""

    blueprint_id: str
    blueprint_version: int = 1
    context_dimensions_hydrated: int
    context_highlights: dict[str, Any] = Field(default_factory=dict)
    confidence_ledger: list[ConfidenceLedgerEntry] = Field(default_factory=list)
    hypothesis_evolution: list[HypothesisWaveCurve] = Field(default_factory=list)
    wave_executions: list[WaveExecutionTrace] = Field(default_factory=list)
    pack_executions: list[PackExecutionReceipt] = Field(default_factory=list)
    decision_policy: DecisionPolicyEvaluation
    verification_and_rollback: VerificationAndRollbackSpec
    citations: list[str] = Field(default_factory=list)


class InvestigationStoryResponse(BaseModel):
    """Unified investigation response carrying both Analyst Mode and Expert Mode."""

    incident_id: str
    blueprint_id: str
    blueprint_title: str
    analyst_mode: AnalystModeProjection
    expert_mode: ExpertModeProjection


# ---------------------------------------------------------------------------
# Simplified 3-Category Studio Presentation Models
# ---------------------------------------------------------------------------


class CategoryInvestigationView(BaseModel):
    questions: list[str] = Field(default_factory=list)
    evidence_sources: list[str] = Field(default_factory=list)
    competing_explanations: list[str] = Field(default_factory=list)
    internal_packs: list[str] = Field(default_factory=list)


class CategoryResponseView(BaseModel):
    actions: list[str] = Field(default_factory=list)
    verification_checks: list[str] = Field(default_factory=list)
    rollback_steps: list[str] = Field(default_factory=list)
    reversible: bool = True
    internal_packs: list[str] = Field(default_factory=list)


class CategoryGovernanceView(BaseModel):
    approval_policy: str
    confidence_threshold: int = 80
    blast_radius_ceiling: str = "Single identity or workload (0 shared production DBs)"
    escalation_path: str
    internal_packs: list[str] = Field(default_factory=list)


class ThreeCategoryRunbookView(BaseModel):
    investigation: CategoryInvestigationView
    response: CategoryResponseView
    governance: CategoryGovernanceView


class ComposablePackItem(BaseModel):
    pack_id: str
    version: int = 1
    title: str
    description: str
    internal_type: InternalPackType
    visible_category: VisiblePackCategory
    human_summary: list[str] = Field(default_factory=list)
    reused_in_blueprints: int = 1


class RunbookBlueprint(BaseModel):
    blueprint_id: str
    version: int = 1
    title: str
    subtitle: str
    domain: Literal["Identity", "Endpoint", "Cloud & SRE", "Network", "Email & SaaS", "Data"] = "Identity"
    mitre_techniques: list[str] = Field(default_factory=list)
    trigger_summary: str
    target_l1_time_seconds: int = 30
    avg_confidence_percent: int = 89
    categories_view: ThreeCategoryRunbookView
