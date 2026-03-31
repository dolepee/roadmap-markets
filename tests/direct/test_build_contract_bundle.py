from pathlib import Path

from scripts.build_contract_bundle import DEFAULT_DEPENDS, build_bundle


def test_build_bundle_produces_single_file_without_local_import():
    bundled = build_bundle()
    assert f'# {{ "Depends": "{DEFAULT_DEPENDS}" }}' in bundled
    assert "from genlayer import *" in bundled
    assert "from roadmap_market_utils import" not in bundled
    assert "class RoadmapMarket(gl.Contract):" in bundled
    assert bundled.count("class RoadmapMarket(gl.Contract):") == 1


def test_bundle_starts_with_depends_magic_comment():
    bundled = build_bundle("py-genlayer:custom-hash")
    first_line = bundled.splitlines()[0]
    assert first_line == '# { "Depends": "py-genlayer:custom-hash" }'
    assert not bundled.startswith("# v")


def test_bundle_keeps_helper_symbols():
    bundled = build_bundle()
    assert "def build_resolution_prompt(" in bundled
    assert "def normalize_resolution_output(" in bundled
    assert "def compute_claim_payout(" in bundled
    assert "def equivalent_resolution(" in bundled


def test_bundle_source_compiles():
    bundled = build_bundle()
    compile(bundled, "roadmap_market_standalone.py", "exec")


def test_bundle_output_path_target_is_in_contracts_dir():
    root = Path(__file__).resolve().parents[2]
    expected = root / "contracts" / "roadmap_market_standalone.py"
    assert str(expected).endswith("contracts/roadmap_market_standalone.py")
