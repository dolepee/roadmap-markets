from roadmap_market_utils import (
    build_market_question,
    build_resolution_prompt,
    compute_claim_payout,
    compute_protocol_fee,
    derive_resolution,
    equivalent_resolution,
    normalize_text_input,
    normalize_resolution_output,
    normalize_url,
    position_key,
)


def test_normalize_url_adds_scheme_and_normalizes_path():
    assert normalize_url("example.com/docs/") == "https://example.com/docs"
    assert normalize_url("https://Example.com") == "https://example.com/"
    assert normalize_url("") == ""
    assert normalize_url(0) == ""


def test_normalize_text_input_handles_cli_blank_sentinel_and_non_strings():
    assert normalize_text_input(None) == ""
    assert normalize_text_input(0) == ""
    assert normalize_text_input("  hello  ") == "hello"
    assert normalize_text_input(42) == "42"


def test_build_market_question_uses_project_milestone_and_deadline():
    question = build_market_question("DemoProtocol", "launch mainnet", "2026-04-30")
    assert question == "Will DemoProtocol launch mainnet by 2026-04-30?"


def test_build_market_question_tolerates_non_string_blank_question_inputs():
    question = build_market_question("DemoProtocol", "launch a working public beta", 20260325)
    assert question == "Will DemoProtocol launch a working public beta by 20260325?"


def test_normalize_resolution_output_coerces_mixed_values():
    normalized = normalize_resolution_output(
        {
            "product_live": "yes",
            "feature_usable": 1,
            "docs_or_changelog_live": False,
            "repo_or_chain_evidence": "0",
            "notes": "  Public beta is live.  "
        }
    )
    assert normalized["checklist"] == {
        "product_live": True,
        "feature_usable": True,
        "docs_or_changelog_live": False,
        "repo_or_chain_evidence": False,
    }
    assert normalized["resolution"] == "NO"
    assert normalized["notes"] == "Public beta is live."
    assert len(normalized["fingerprint"]) == 16


def test_derive_resolution_requires_all_checklist_fields():
    assert (
        derive_resolution(
            {
                "product_live": True,
                "feature_usable": True,
                "docs_or_changelog_live": True,
                "repo_or_chain_evidence": True,
            }
        )
        == "YES"
    )
    assert (
        derive_resolution(
            {
                "product_live": True,
                "feature_usable": False,
                "docs_or_changelog_live": True,
                "repo_or_chain_evidence": True,
            }
        )
        == "NO"
    )


def test_equivalent_resolution_requires_exact_booleans_and_resolution():
    leader = normalize_resolution_output(
        {
            "product_live": True,
            "feature_usable": True,
            "docs_or_changelog_live": True,
            "repo_or_chain_evidence": True,
        }
    )
    validator = normalize_resolution_output(
        {
            "product_live": True,
            "feature_usable": True,
            "docs_or_changelog_live": True,
            "repo_or_chain_evidence": True,
        }
    )
    mismatch = normalize_resolution_output(
        {
            "product_live": True,
            "feature_usable": False,
            "docs_or_changelog_live": True,
            "repo_or_chain_evidence": True,
        }
    )
    assert equivalent_resolution(validator, leader) is True
    assert equivalent_resolution(mismatch, leader) is False


def test_compute_protocol_fee_and_yes_side_payout():
    fee = compute_protocol_fee(yes_pool=60, no_pool=40, resolution="YES", fee_bps=500)
    payout = compute_claim_payout(
        yes_amount=15,
        no_amount=0,
        yes_pool=60,
        no_pool=40,
        resolution="YES",
        fee_bps=500,
    )
    assert fee == 2
    assert payout == 24


def test_compute_claim_payout_for_no_side_winner():
    payout = compute_claim_payout(
        yes_amount=0,
        no_amount=25,
        yes_pool=50,
        no_pool=50,
        resolution="NO",
        fee_bps=0,
    )
    assert payout == 50


def test_compute_claim_payout_returns_zero_for_loser():
    assert (
        compute_claim_payout(
            yes_amount=0,
            no_amount=20,
            yes_pool=60,
            no_pool=40,
            resolution="YES",
            fee_bps=0,
        )
        == 0
    )


def test_position_key_is_market_and_address_specific():
    assert position_key("market-1", "0xABC") == "market-1:0xabc"


def test_resolution_prompt_contains_fixed_schema_fields():
    prompt = build_resolution_prompt(
        question="Will DemoProtocol launch mainnet by 2026-04-30?",
        project_name="DemoProtocol",
        milestone_text="launch mainnet",
        deadline_text="2026-04-30",
        product_url="https://demo.xyz/app",
        docs_url="https://docs.demo.xyz",
        repo_url="https://github.com/demo/repo",
        chain_url="https://explorer.demo.xyz",
        product_text="app is live",
        docs_text="docs updated",
        repo_text="release candidate merged",
        chain_text="contract deployed",
    )
    assert '"product_live": true' in prompt
    assert '"feature_usable": true' in prompt
    assert '"docs_or_changelog_live": true' in prompt
    assert '"repo_or_chain_evidence": true' in prompt
