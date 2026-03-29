# { "Depends": "py-genlayer:test" }

from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from html import unescape
from html.parser import HTMLParser
import json
import typing
from typing import Any
from urllib.parse import urlparse

from genlayer import *


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


@allow_storage
@dataclass
class MarketRecord:
    market_id: str
    question: str
    project_name: str
    milestone_text: str
    deadline_text: str
    product_url: str
    docs_url: str
    repo_url: str
    chain_url: str
    fee_bps: u256
    yes_pool: u256
    no_pool: u256
    resolved: bool
    resolution: str
    checklist_json: str
    notes: str
    creator: Address
    resolved_by: Address
    fee_amount: u256


@allow_storage
@dataclass
class PositionRecord:
    market_id: str
    trader: Address
    yes_amount: u256
    no_amount: u256
    claimed: bool


def fetch_evidence_text(url: str) -> str:
    if not url:
        return ""

    try:
        response = gl.nondet.web.get(url)
        if hasattr(response, "body"):
            raw = response.body.decode("utf-8", errors="ignore")
        else:
            raw = str(response)
    except Exception:
        raw = ""

    return extract_readable_text(raw)[:7000]


def build_market_snapshot(market: MarketRecord) -> str:
    return json.dumps(
        {
            "market_id": market.market_id,
            "question": market.question,
            "project_name": market.project_name,
            "milestone_text": market.milestone_text,
            "deadline_text": market.deadline_text,
            "product_url": market.product_url,
            "docs_url": market.docs_url,
            "repo_url": market.repo_url,
            "chain_url": market.chain_url,
            "fee_bps": int(market.fee_bps),
            "yes_pool": int(market.yes_pool),
            "no_pool": int(market.no_pool),
            "resolved": bool(market.resolved),
            "resolution": market.resolution,
            "checklist": json.loads(market.checklist_json) if market.checklist_json else {},
            "notes": market.notes,
            "creator": str(market.creator),
            "resolved_by": str(market.resolved_by),
            "fee_amount": int(market.fee_amount),
        },
        sort_keys=True,
    )


def build_position_snapshot(position: PositionRecord) -> str:
    return json.dumps(
        {
            "market_id": position.market_id,
            "trader": str(position.trader),
            "yes_amount": int(position.yes_amount),
            "no_amount": int(position.no_amount),
            "claimed": bool(position.claimed),
        },
        sort_keys=True,
    )


def equivalent_resolution_json(validator_output: str, leader_output: str) -> bool:
    return equivalent_resolution(
        json.loads(str(validator_output)),
        json.loads(str(leader_output)),
    )


class RoadmapMarket(gl.Contract):
    owner: Address
    next_market_id: u256
    protocol_fee_balance: u256
    market_ids: DynArray[str]
    markets: TreeMap[str, MarketRecord]
    positions: TreeMap[str, PositionRecord]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.next_market_id = u256(1)
        self.protocol_fee_balance = u256(0)

    @gl.public.write
    def create_market(
        self,
        question: str,
        project_name: str,
        milestone_text: str,
        deadline_text: str,
        product_url: str,
        docs_url: str,
        repo_url: str,
        chain_url: str,
        fee_bps: int,
    ) -> str:
        if fee_bps < 0 or fee_bps > 1_000:
            raise Exception("fee_bps must be between 0 and 1000")

        normalized_project_name = normalize_text_input(project_name)
        normalized_milestone_text = normalize_text_input(milestone_text)
        normalized_deadline_text = normalize_text_input(deadline_text)
        normalized_question = normalize_text_input(question)

        if not normalized_project_name:
            raise Exception("project_name is required")
        if not normalized_milestone_text:
            raise Exception("milestone_text is required")
        if not normalized_deadline_text:
            raise Exception("deadline_text is required")

        market_id = f"market-{int(self.next_market_id)}"
        normalized_question = normalized_question or build_market_question(
            normalized_project_name,
            normalized_milestone_text,
            normalized_deadline_text,
        )
        self.markets[market_id] = MarketRecord(
            market_id=market_id,
            question=normalized_question,
            project_name=normalized_project_name,
            milestone_text=normalized_milestone_text,
            deadline_text=normalized_deadline_text,
            product_url=normalize_url(product_url),
            docs_url=normalize_url(docs_url),
            repo_url=normalize_url(repo_url),
            chain_url=normalize_url(chain_url),
            fee_bps=u256(fee_bps),
            yes_pool=u256(0),
            no_pool=u256(0),
            resolved=False,
            resolution="",
            checklist_json="",
            notes="",
            creator=gl.message.sender_address,
            resolved_by=Address("0x0000000000000000000000000000000000000000"),
            fee_amount=u256(0),
        )
        self.market_ids.append(market_id)
        self.next_market_id = u256(int(self.next_market_id) + 1)
        return market_id

    @gl.public.write
    def buy_yes(self, market_id: str, amount: int) -> u256:
        return self._buy_position(market_id, "YES", amount)

    @gl.public.write
    def buy_no(self, market_id: str, amount: int) -> u256:
        return self._buy_position(market_id, "NO", amount)

    @gl.public.write
    def resolve_market(self, market_id: str) -> str:
        market = self._require_market(market_id)
        if market.resolved:
            raise Exception("market already resolved")
        if gl.message.sender_address != market.creator and gl.message.sender_address != self.owner:
            raise Exception("only creator or owner can resolve")

        question = market.question
        project_name = market.project_name
        milestone_text = market.milestone_text
        deadline_text = market.deadline_text
        product_url = market.product_url
        docs_url = market.docs_url
        repo_url = market.repo_url
        chain_url = market.chain_url

        def leader_fn():
            product_text = fetch_evidence_text(product_url)
            docs_text = fetch_evidence_text(docs_url)
            repo_text = fetch_evidence_text(repo_url)
            chain_text = fetch_evidence_text(chain_url)
            prompt = build_resolution_prompt(
                question=question,
                project_name=project_name,
                milestone_text=milestone_text,
                deadline_text=deadline_text,
                product_url=product_url,
                docs_url=docs_url,
                repo_url=repo_url,
                chain_url=chain_url,
                product_text=product_text,
                docs_text=docs_text,
                repo_text=repo_text,
                chain_text=chain_text,
            )
            response = gl.nondet.exec_prompt(prompt, response_format="json")
            normalized = normalize_resolution_output(
                response if isinstance(response, dict) else json.loads(str(response))
            )
            return json.dumps(normalized, sort_keys=True)

        def validator_fn(leader_result: gl.vm.Result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False

            product_text = fetch_evidence_text(product_url)
            docs_text = fetch_evidence_text(docs_url)
            repo_text = fetch_evidence_text(repo_url)
            chain_text = fetch_evidence_text(chain_url)
            prompt = build_resolution_prompt(
                question=question,
                project_name=project_name,
                milestone_text=milestone_text,
                deadline_text=deadline_text,
                product_url=product_url,
                docs_url=docs_url,
                repo_url=repo_url,
                chain_url=chain_url,
                product_text=product_text,
                docs_text=docs_text,
                repo_text=repo_text,
                chain_text=chain_text,
            )
            response = gl.nondet.exec_prompt(prompt, response_format="json")
            mine = normalize_resolution_output(
                response if isinstance(response, dict) else json.loads(str(response))
            )
            return equivalent_resolution_json(
                json.dumps(mine, sort_keys=True),
                leader_result.calldata,
            )

        result = gl.vm.run_nondet(leader_fn, validator_fn)
        payload = json.loads(str(result))
        market.resolved = True
        market.resolution = str(payload.get("resolution", "NO"))
        market.checklist_json = json.dumps(payload.get("checklist", {}), sort_keys=True)
        market.notes = str(payload.get("notes", ""))
        market.resolved_by = gl.message.sender_address
        market.fee_amount = u256(
            compute_protocol_fee(
                int(market.yes_pool),
                int(market.no_pool),
                market.resolution,
                int(market.fee_bps),
            )
        )
        self.protocol_fee_balance = u256(int(self.protocol_fee_balance) + int(market.fee_amount))
        self.markets[market_id] = market
        return market.resolution

    @gl.public.write
    def claim(self, market_id: str) -> u256:
        market = self._require_market(market_id)
        if not market.resolved:
            raise Exception("market not resolved")

        trader = gl.message.sender_address
        key = position_key(market_id, str(trader))
        position = self.positions.get(key, self._empty_position(market_id, trader))
        if position.claimed:
            raise Exception("position already claimed")

        payout = compute_claim_payout(
            int(position.yes_amount),
            int(position.no_amount),
            int(market.yes_pool),
            int(market.no_pool),
            market.resolution,
            int(market.fee_bps),
        )
        if payout <= 0:
            raise Exception("no winnings to claim")

        position.claimed = True
        self.positions[key] = position
        return u256(payout)

    @gl.public.write
    def withdraw_protocol_fees(self, amount: int) -> u256:
        if gl.message.sender_address != self.owner:
            raise Exception("only owner")
        if amount < 0 or amount > int(self.protocol_fee_balance):
            raise Exception("invalid amount")

        self.protocol_fee_balance = u256(int(self.protocol_fee_balance) - amount)
        return u256(amount)

    @gl.public.view
    def get_market(self, market_id: str) -> str:
        return build_market_snapshot(self._require_market(market_id))

    @gl.public.view
    def get_position(self, market_id: str, trader_address: Address) -> str:
        trader = trader_address
        key = position_key(market_id, str(trader))
        position = self.positions.get(key, self._empty_position(market_id, trader))
        return build_position_snapshot(position)

    @gl.public.view
    def get_market_ids(self) -> DynArray[str]:
        return self.market_ids

    @gl.public.view
    def quote_claim(self, market_id: str, trader_address: Address) -> u256:
        market = self._require_market(market_id)
        if not market.resolved:
            return u256(0)
        trader = trader_address
        key = position_key(market_id, str(trader))
        position = self.positions.get(key, self._empty_position(market_id, trader))
        return u256(
            compute_claim_payout(
                int(position.yes_amount),
                int(position.no_amount),
                int(market.yes_pool),
                int(market.no_pool),
                market.resolution,
                int(market.fee_bps),
            )
        )

    def _buy_position(self, market_id: str, side: str, amount: int) -> u256:
        market = self._require_market(market_id)
        if market.resolved:
            raise Exception("market already resolved")
        if amount <= 0:
            raise Exception("amount must be positive")

        trader = gl.message.sender_address
        key = position_key(market_id, str(trader))
        position = self.positions.get(key, self._empty_position(market_id, trader))

        if side == "YES":
            market.yes_pool = u256(int(market.yes_pool) + amount)
            position.yes_amount = u256(int(position.yes_amount) + amount)
        else:
            market.no_pool = u256(int(market.no_pool) + amount)
            position.no_amount = u256(int(position.no_amount) + amount)

        self.markets[market_id] = market
        self.positions[key] = position
        return u256(amount)

    def _require_market(self, market_id: str) -> MarketRecord:
        if market_id not in self.markets:
            raise Exception("unknown market")
        return self.markets[market_id]

    def _empty_position(self, market_id: str, trader: Address) -> PositionRecord:
        return PositionRecord(
            market_id=market_id,
            trader=trader,
            yes_amount=u256(0),
            no_amount=u256(0),
            claimed=False,
        )
