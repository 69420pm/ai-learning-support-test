from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Sequence

from langchain.agents import create_agent
from langchain.agents.structured_output import ToolStrategy
from langchain_google_genai import ChatGoogleGenerativeAI
from pypdf import PdfReader
from google import genai

from ai.preprocessing_layer_0.layer_0_response_format import Layer0SlideSummary
from ai.preprocessing_layer_1.layer_1_response_format import Layer1ContentMap
from pdf_collector.models import PDFDocument
from pdf_collector.services.pdf_splitter import split_documents_flat

# -----------------------------
# Model configuration
# -----------------------------

LAYER_0_MODEL = "gemini-3.1-flash-lite-preview"
LAYER_1_MODEL = "gemini-3-flash-preview"


def initialize_ai(model: str = LAYER_0_MODEL) -> ChatGoogleGenerativeAI:
    """
    Initialize and return a Gemini chat model client.
    """
    return ChatGoogleGenerativeAI(model=model)


# -----------------------------
# Prompt templates
# -----------------------------

LAYER_0_PROMPT_TEMPLATE = """
You are a strict information extraction system.

Goal:
Given a chunk of up to 5 sequential slides/pages from course material, extract one compact JSON object per slide.

Rules:
- Return ONLY valid JSON (no markdown).
- Output MUST be a JSON array where each item follows this schema exactly:

{{
  "slide_id": "string, stable and unique (e.g. <file_id>:p<page>)",
  "ref": {{
    "file_id": "string",
    "page": 1
  }},
  "title": "string",
  "summary": "short paragraph",
  "key_facts": [
    {{"kind": "definition|formula|claim|example|procedure|result|note", "text": "string"}}
  ],
  "terms": ["string"],
  "open_questions": ["string"],
  "related_slide_ids": ["string"]
}}

Constraints:
- Keep fields concise to save tokens.
- Include only important information.
- If title is not explicit, infer a short title.
- "related_slide_ids" should reference only pages from this chunk when clearly connected.
- Never omit required keys; use empty arrays if needed.
- Preserve the given page numbers in ref.page.

Chunk metadata:
file_id: {file_id}

Slides content:
{slides_text}
""".strip()

LAYER_1_PROMPT_TEMPLATE = """
You are building a compact knowledge map from detailed slide summaries.

Input:
A JSON array of layer-0 slide summaries.

Task:
Create ONE JSON object with this exact schema:

{{
  "map_id": "string",
  "title": "string",
  "topics": [
    {{
      "topic_id": "string",
      "name": "string",
      "summary": "string",
      "layer0_refs": [
        {{"slide_id": "string", "file_id": "string", "page": 1}}
      ],
      "relations": [
        {{"target_topic_id": "string", "relation_type": "parent_of|subtopic_of|depends_on|related_to|contrasts_with"}}
      ],
      "oddities": ["string"]
    }}
  ],
  "global_oddities": ["string"]
}}

Requirements:
- Keep structure compact but informative.
- Clearly separate topics.
- Add relations when meaningful.
- Record notation/terminology oddities (e.g., non-standard math notation).
- Every topic should reference relevant layer-0 summaries via layer0_refs.
- Return ONLY valid JSON, no markdown, no explanations.

Layer-0 summaries:
{layer0_summaries_json}
""".strip()


# -----------------------------
# Core helpers
# -----------------------------

def _extract_chunk_pages(path: Path) -> list[tuple[int, str]]:
    """
    Extract all pages from one chunk PDF.
    Page numbering is local to chunk (1..N), which is fine because file_id is chunk-specific.
    """
    reader = PdfReader(str(path))
    pages: list[tuple[int, str]] = []
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        pages.append((i, text))
    return pages


def _build_slides_text(pages: Sequence[tuple[int, str]]) -> str:
    parts: list[str] = []
    for page_num, text in pages:
        parts.append(f"[PAGE {page_num}]\n{text if text else '(empty page text)'}")
    return "\n\n".join(parts)


def _extract_json_snippet(text: str) -> str:
    """
    Best-effort extraction of JSON object/array from model text.
    Handles markdown fences and surrounding prose.
    """
    stripped = text.strip()

    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()

    match = re.search(r"(\{.*\}|\[.*\])", stripped, flags=re.DOTALL)
    return match.group(1).strip() if match else stripped


def _safe_json_loads(raw: Any) -> Any:
    """
    Robust JSON parsing for varied model outputs.
    Supports:
    - already-parsed Python dict/list
    - string JSON
    - LangChain message-style content lists
    """
    if isinstance(raw, (dict, list)):
        return raw

    if raw is None:
        raise ValueError("Model returned empty response.")

    if isinstance(raw, list):
        text_parts: list[str] = []
        for item in raw:
            if isinstance(item, str):
                text_parts.append(item)
            elif isinstance(item, dict):
                txt = item.get("text")
                if isinstance(txt, str):
                    text_parts.append(txt)
        raw = "\n".join(text_parts)

    if not isinstance(raw, str):
        raw = str(raw)

    candidate = _extract_json_snippet(raw)
    return json.loads(candidate)


def _validate_layer0_item(item: dict[str, Any]) -> None:
    required = {"slide_id", "ref", "title", "summary", "key_facts", "terms", "open_questions", "related_slide_ids"}
    missing = required - set(item.keys())
    if missing:
        raise ValueError(f"Layer 0 item missing keys: {sorted(missing)}")

    ref = item.get("ref")
    if not isinstance(ref, dict) or "file_id" not in ref or "page" not in ref:
        raise ValueError("Layer 0 item has invalid ref; expected {'file_id': str, 'page': int}.")

    Layer0SlideSummary(**item)


# -----------------------------
# Layer 0
# -----------------------------

def run_layer_0(
    chunk_paths: Sequence[Path],
    model_name: str = LAYER_0_MODEL,
) -> list[str]:
    """
    Run layer 0 on chunk PDFs from the splitter.
    Returns one JSON string per slide summary.
    """
    llm = initialize_ai(model=model_name)
    all_slide_json_strings: list[str] = []

    for chunk_path in chunk_paths:
        file_id = chunk_path.stem
        pages = _extract_chunk_pages(chunk_path)
        if not pages:
            continue

        prompt = LAYER_0_PROMPT_TEMPLATE.format(
            file_id=file_id,
            slides_text=_build_slides_text(pages),
        )

        response = llm.invoke(prompt)
        parsed = _safe_json_loads(response.content)

        if not isinstance(parsed, list):
            raise ValueError("Layer 0 model output must be a JSON array.")

        for item in parsed:
            if not isinstance(item, dict):
                raise ValueError("Layer 0 JSON array must contain objects only.")
            _validate_layer0_item(item)
            all_slide_json_strings.append(json.dumps(item, ensure_ascii=False))

    return all_slide_json_strings


# -----------------------------
# Layer 1
# -----------------------------

def run_layer_1(
    layer0_json_strings: Sequence[str],
    model_name: str = LAYER_1_MODEL,
) -> dict[str, Any]:
    """
    Run layer 1 to produce a global topic map from layer-0 summaries.
    """
    llm = initialize_ai(model=model_name, temperature=0.0)

    layer0_items: list[dict[str, Any]] = [json.loads(s) for s in layer0_json_strings]
    layer0_summaries_json = json.dumps(layer0_items, ensure_ascii=False)

    prompt = LAYER_1_PROMPT_TEMPLATE.format(layer0_summaries_json=layer0_summaries_json)
    response = llm.invoke(prompt)
    parsed = _safe_json_loads(response.content)

    if not isinstance(parsed, dict):
        raise ValueError("Layer 1 model output must be a JSON object.")

    required_top_level = {"map_id", "title", "topics", "global_oddities"}
    missing = required_top_level - set(parsed.keys())
    if missing:
        raise ValueError(f"Layer 1 output missing keys: {sorted(missing)}")

    Layer1ContentMap(**parsed)
    return parsed


# -----------------------------
# Output persistence
# -----------------------------

def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_layer_0_outputs(layer0_json_strings: Sequence[str], output_dir: Path) -> Path:
    _ensure_dir(output_dir)
    out_file = output_dir / "layer0_slide_summaries.jsonl"
    with out_file.open("w", encoding="utf-8") as f:
        for row in layer0_json_strings:
            f.write(row)
            f.write("\n")
    return out_file


def save_layer_1_output(layer1_map: dict[str, Any], output_dir: Path) -> Path:
    _ensure_dir(output_dir)
    out_file = output_dir / "layer1_content_map.json"
    with out_file.open("w", encoding="utf-8") as f:
        json.dump(layer1_map, f, ensure_ascii=False, indent=2)
    return out_file


# -----------------------------
# Public pipeline
# -----------------------------

def process_documents(
    documents: list[PDFDocument],
    output_dir: Path | str = Path("ai_outputs"),
):
    """
    Two-layer pipeline:
    1) Split source PDFs into overlapping chunks via pdf_splitter service.
    2) Layer 0 on chunk PDFs -> compact per-slide JSON strings.
    3) Layer 1 over all layer-0 summaries -> global topic map.
    """

    # layer 0
    google_files = []
    for doc in documents:
        if not isinstance(doc, PDFDocument):
            raise ValueError(f"Expected PDFDocument, got {type(doc)}")
        client = genai.Client()
        file = client.files.upload(file=str(doc.path))
        google_files.append(file)

    for file in google_files:
        model = create_agent(model=LAYER_0_MODEL, response_format=ToolStrategy(Layer0SlideSummary))
        response = model.invoke(file.uri)
        print(response)


    # output_path = Path(output_dir)
    #
    # layer0_json_strings = run_layer_0(chunk_paths=chunk_paths, model_name=LAYER_0_MODEL)
    # layer0_file = save_layer_0_outputs(layer0_json_strings, output_path)
    #
    # layer1_map = run_layer_1(layer0_json_strings=layer0_json_strings, model_name=LAYER_1_MODEL)
    # layer1_file = save_layer_1_output(layer1_map, output_path)
    #
    # return {
    #     "layer0_count": len(layer0_json_strings),
    #     "layer0_file": str(layer0_file),
    #     "layer1_file": str(layer1_file),
    #     "layer1_map": layer1_map,
    # }
