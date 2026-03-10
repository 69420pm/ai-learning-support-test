from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass
class Layer0SummaryRef:
    """
    Reference to a layer 0 slide summary.
    """
    slide_id: str
    file_id: str
    page: int


@dataclass
class TopicRelation:
    """
    Relation between two topics in the layer 1 map.
    """
    target_topic_id: str
    relation_type: str  # e.g. "parent_of", "depends_on", "related_to"


@dataclass
class TopicNode:
    """
    Compact topic node for the high-level content map.
    """
    topic_id: str
    name: str
    summary: str
    layer0_refs: List[Layer0SummaryRef] = field(default_factory=list)
    relations: List[TopicRelation] = field(default_factory=list)
    oddities: List[str] = field(default_factory=list)


@dataclass
class Layer1ContentMap:
    """
    Final structured map built from layer 0 summaries.
    """
    map_id: str
    title: str
    topics: List[TopicNode] = field(default_factory=list)
    global_oddities: List[str] = field(default_factory=list)
