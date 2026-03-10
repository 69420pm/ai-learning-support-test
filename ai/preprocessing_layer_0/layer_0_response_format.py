from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass
class SlideFact:
    """
    One atomic, important piece of information found on a slide.
    Kept intentionally compact for token efficiency.
    """

    kind: str
    text: str


@dataclass
class SlideReference:
    """
    Lightweight reference to trace extracted data back to source.
    """

    file_id: str
    page: int


@dataclass
class Layer0SlideSummary:
    """
    Compact structured output for a single slide.

    This object is intended to be serialized to one JSON string per slide.
    """

    slide_id: str
    ref: SlideReference
    title: str
    summary: str
    key_facts: List[SlideFact] = field(default_factory=list)
    terms: List[str] = field(default_factory=list)
    open_questions: List[str] = field(default_factory=list)
    related_slide_ids: List[str] = field(default_factory=list)


@dataclass
class Layer0BatchOutput:
    """
    Optional container for a processing batch (typically 5 slides).
    """

    batch_id: str
    slides: List[Layer0SlideSummary] = field(default_factory=list)
