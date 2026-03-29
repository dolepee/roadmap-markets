from __future__ import annotations

from hashlib import sha256
from html import unescape
from html.parser import HTMLParser
import json
from typing import Any
from urllib.parse import urlparse


CHECKLIST_FIELDS = (
    "product_live",
    "feature_usable",
    "docs_or_changelog_live",
    "repo_or_chain_evidence",
)
CHECKLIST_LABELS = {
    "product_live": "Public product surface is live",
    "feature_usable": "Promised feature is actually usable",
    "docs_or_changelog_live": "Docs or changelog are public",
    "repo_or_chain_evidence": "Repo or chain evidence supports launch",
}


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"script", "style", "noscript"}:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style", "noscript"} and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth > 0:
            return
        text = data.strip()
        if text:
            self.parts.append(text)


def normalize_text_input(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float)) and value == 0:
        return ""
    return str(value).strip()


def normalize_url(url: str) -> str:
    candidate = normalize_text_input(url)
    if not candidate:
        return ""
    if "://" not in candidate:
        candidate = f"https://{candidate}"
    parsed = urlparse(candidate)
    scheme = parsed.scheme or "https"
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/") or "/"
    return f"{scheme}://{netloc}{path}"


def build_market_question(project_name: str, milestone_text: str, deadline_text: str) -> str:
    project = normalize_text_input(project_name) or "This project"
    milestone = normalize_text_input(milestone_text)
    deadline = normalize_text_input(deadline_text)
    return f"Will {project} {milestone} by {deadline}?"


def extract_readable_text(raw: str) -> str:
    text = raw.strip()
    if not text:
        return ""

    lowered = text.lower()
    if "<html" in lowered or "<body" in lowered or "<title" in lowered or "<meta" in lowered:
        parser = TextExtractor()
        parser.feed(text)
        text = " ".join(parser.parts)

    text = unescape(text)
    return " ".join(text.split())


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value != 0
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "yes", "1", "y"}:
            return True
        if lowered in {"false", "no", "0", "n", ""}:
            return False
    return False


def normalize_resolution_output(raw_output: Any) -> dict[str, Any]:
    if isinstance(raw_output, str):
        payload = json.loads(raw_output)
    else:
        payload = raw_output

    checklist_source = payload.get("checklist", payload)
    checklist = {field: _coerce_bool(checklist_source.get(field, False)) for field in CHECKLIST_FIELDS}
    notes = str(payload.get("notes", "")).strip()
    notes = " ".join(notes.split())[:400]
    resolution = derive_resolution(checklist)
    digest = resolution_fingerprint(checklist)

    return {
        "checklist": checklist,
        "resolution": resolution,
        "notes": notes,
        "fingerprint": digest,
    }


def derive_resolution(checklist: dict[str, bool]) -> str:
    return "YES" if all(bool(checklist.get(field, False)) for field in CHECKLIST_FIELDS) else "NO"


def equivalent_resolution(validator: dict[str, Any], leader: dict[str, Any]) -> bool:
    validator_checklist = validator.get("checklist", {})
    leader_checklist = leader.get("checklist", {})
    return all(
        bool(validator_checklist.get(field, False)) == bool(leader_checklist.get(field, False))
        for field in CHECKLIST_FIELDS
    ) and str(validator.get("resolution", "")) == str(leader.get("resolution", ""))


def resolution_fingerprint(checklist: dict[str, bool]) -> str:
    ordered = "|".join(f"{field}:{int(bool(checklist.get(field, False)))}" for field in CHECKLIST_FIELDS)
    return sha256(ordered.encode("utf-8")).hexdigest()[:16]


def build_resolution_prompt(
    question: str,
    project_name: str,
    milestone_text: str,
    deadline_text: str,
    product_url: str,
    docs_url: str,
    repo_url: str,
    chain_url: str,
    product_text: str,
    docs_text: str,
    repo_text: str,
    chain_text: str,
) -> str:
    return f"""
You are resolving a roadmap market for a crypto project.

Question:
{question}

Project:
{project_name}

Milestone:
{milestone_text}

Deadline:
{deadline_text}

Return strict JSON only:
{{
  "product_live": true,
  "feature_usable": true,
  "docs_or_changelog_live": true,
  "repo_or_chain_evidence": true,
  "notes": "short explanation"
}}

Rules:
- Mark a field true only if the supplied evidence directly supports it.
- Do not speculate from missing information.
- product_live means a public product surface exists at the product URL.
- feature_usable means the promised feature appears actually usable, not merely announced.
- docs_or_changelog_live means there are public docs, release notes, or changelog evidence.
- repo_or_chain_evidence means the repo or chain evidence supports real delivery.
- Ignore market sentiment, token price, and social hype.
- Do not return a final YES/NO. The contract will derive it.

Evidence URLs:
- Product: {product_url or "(none)"}
- Docs: {docs_url or "(none)"}
- Repo: {repo_url or "(none)"}
- Chain: {chain_url or "(none)"}

Product evidence:
{product_text}

Docs evidence:
{docs_text}

Repo evidence:
{repo_text}

Chain evidence:
{chain_text}
"""


def position_key(market_id: str, trader: str) -> str:
    return f"{market_id}:{trader.lower()}"


def compute_protocol_fee(yes_pool: int, no_pool: int, resolution: str, fee_bps: int) -> int:
    losing_pool = no_pool if resolution == "YES" else yes_pool
    return losing_pool * fee_bps // 10_000


def compute_claim_payout(
    yes_amount: int,
    no_amount: int,
    yes_pool: int,
    no_pool: int,
    resolution: str,
    fee_bps: int,
) -> int:
    winning_amount = yes_amount if resolution == "YES" else no_amount
    winning_pool = yes_pool if resolution == "YES" else no_pool
    losing_pool = no_pool if resolution == "YES" else yes_pool

    if winning_amount <= 0 or winning_pool <= 0:
        return 0

    fee_amount = compute_protocol_fee(yes_pool, no_pool, resolution, fee_bps)
    distributable_losing_pool = max(losing_pool - fee_amount, 0)
    return winning_amount + (winning_amount * distributable_losing_pool // winning_pool)
