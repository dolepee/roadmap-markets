# { "Depends": "py-genlayer:test" }

from dataclasses import dataclass
import json
import typing

from genlayer import *
from roadmap_market_utils import (
    CHECKLIST_FIELDS,
    build_market_question,
    build_resolution_prompt,
    compute_claim_payout,
    compute_protocol_fee,
    equivalent_resolution,
    extract_readable_text,
    normalize_text_input,
    normalize_resolution_output,
    normalize_url,
    position_key,
)


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
