#!/usr/bin/env python3
"""
collect_run_logs.py - Harvests and aggregates agent conversation logs into a concise execution trace.

Discovers parent-child conversation hierarchies (subagents), parses transcript.jsonl /
transcript_full.jsonl files, and outputs a clean, compact Markdown execution trace
where tool calls are summarized in a single line per call and outputs are condensed.
"""

import os
import sys
import json
import re
import argparse
from typing import Dict, List, Any, Optional, Set
from datetime import datetime, timezone

DEFAULT_BRAIN_DIR = "/home/vscode/.gemini/antigravity-cli/brain"
UUID_REGEX = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE)


class ConversationNode:
    def __init__(self, conv_id: str, parent_id: Optional[str] = None, role: str = "Root Agent"):
        self.conv_id = conv_id
        self.parent_id = parent_id
        self.role = role
        self.type_name = "parent" if parent_id is None else "subagent"
        self.children: List['ConversationNode'] = []
        self.steps: List[Dict[str, Any]] = []
        self.start_time: Optional[str] = None
        self.end_time: Optional[str] = None
        self.skills_used: Set[str] = set()
        self.tool_summary: Dict[str, int] = {}
        self.error_count = 0


def find_log_file(brain_dir: str, conv_id: str, use_full: bool = False) -> Optional[str]:
    base_path = os.path.join(brain_dir, conv_id, ".system_generated", "logs")
    filename = "transcript_full.jsonl" if use_full else "transcript.jsonl"
    full_path = os.path.join(base_path, filename)
    
    if os.path.exists(full_path):
        return full_path
    
    fallback_path = os.path.join(base_path, "transcript.jsonl")
    if os.path.exists(fallback_path):
        return fallback_path
    
    return None


def extract_subagent_ids(content_str: str) -> List[Dict[str, str]]:
    """Extracts subagent conversation IDs and roles from tool outputs or messages."""
    subagents = []
    matches = UUID_REGEX.findall(content_str)
    
    try:
        if "conversationId" in content_str:
            pattern = r'"conversationId"\s*:\s*"([0-9a-f-]{36})"'
            for match_id in re.findall(pattern, content_str, re.IGNORECASE):
                subagents.append({"id": match_id, "role": "Subagent"})
    except Exception:
        pass
        
    if not subagents and matches:
        for match_id in set(matches):
            subagents.append({"id": match_id, "role": "Discovered Subagent"})
            
    return subagents


def parse_conversation(
    brain_dir: str,
    conv_id: str,
    parent_id: Optional[str] = None,
    role: str = "Root Agent",
    visited: Optional[Set[str]] = None,
    use_full: bool = False
) -> Optional[ConversationNode]:
    if visited is None:
        visited = set()
        
    if conv_id in visited:
        return None
    visited.add(conv_id)
    
    log_path = find_log_file(brain_dir, conv_id, use_full=use_full)
    if not log_path:
        print(f"[Warning] Log file not found for conversation: {conv_id}", file=sys.stderr)
        return None
        
    node = ConversationNode(conv_id, parent_id=parent_id, role=role)
    child_candidates: List[Dict[str, str]] = []
    
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    step = json.loads(line)
                except json.JSONDecodeError:
                    continue
                    
                node.steps.append(step)
                created_at = step.get("created_at")
                if created_at:
                    if not node.start_time:
                        node.start_time = created_at
                    node.end_time = created_at
                    
                step_type = step.get("type", "")
                
                if step.get("status") == "ERROR" or "error" in str(step.get("content", "")).lower():
                    node.error_count += 1
                    
                tool_calls = step.get("tool_calls", [])
                for tc in tool_calls:
                    t_name = tc.get("name", "")
                    node.tool_summary[t_name] = node.tool_summary.get(t_name, 0) + 1
                    
                    args = tc.get("args", {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except Exception:
                            args = {}
                            
                    if args.get("IsSkillFile") or "SKILL.md" in str(args):
                        skill_match = re.search(r"skills/([^/]+)/SKILL\.md", str(args))
                        if skill_match:
                            node.skills_used.add(skill_match.group(1))
                        else:
                            node.skills_used.add("Skill File Access")
                            
                    if "invoke_subagent" in t_name:
                        subagents_arg = args.get("Subagents", [])
                        if isinstance(subagents_arg, str):
                            try:
                                subagents_arg = json.loads(subagents_arg)
                            except Exception:
                                subagents_arg = []
                        if isinstance(subagents_arg, list):
                            for sa in subagents_arg:
                                sa_role = sa.get("Role", sa.get("TypeName", "Subagent"))
                                child_candidates.append({"role": sa_role, "id": ""})
                                
                content_str = str(step.get("content", ""))
                if "conversationId" in content_str or step_type == "INVOKE_SUBAGENT":
                    extracted = extract_subagent_ids(content_str)
                    for item in extracted:
                        if item["id"] != conv_id and item["id"] != parent_id:
                            role_to_use = item["role"]
                            if child_candidates:
                                role_to_use = child_candidates[0]["role"]
                                child_candidates.pop(0)
                            
                            child_node = parse_conversation(
                                brain_dir,
                                item["id"],
                                parent_id=conv_id,
                                role=role_to_use,
                                visited=visited,
                                use_full=use_full
                            )
                            if child_node:
                                node.children.append(child_node)
                                
    except Exception as e:
        print(f"[Error] Failed reading log {log_path}: {e}", file=sys.stderr)
        
    return node


def collect_all_nodes(node: ConversationNode) -> List[ConversationNode]:
    result = [node]
    for child in node.children:
        result.extend(collect_all_nodes(child))
    return result


def summarize_tool_call(name: str, args: Dict[str, Any]) -> str:
    """Returns a clean, single-line summary of a tool call."""
    if isinstance(args, str):
        try:
            args = json.loads(args)
        except Exception:
            args = {}
            
    clean_name = name.split(":")[-1]
    
    if clean_name == "view_file":
        path = args.get("AbsolutePath", args.get("path", ""))
        start = args.get("StartLine", "")
        end = args.get("EndLine", "")
        line_info = f" (L{start}-L{end})" if (start or end) else ""
        return f"`view_file`: `{path}`{line_info}"
        
    elif clean_name == "replace_file_content":
        path = args.get("TargetFile", "")
        start = args.get("StartLine", "")
        end = args.get("EndLine", "")
        line_info = f" (L{start}-L{end})" if (start or end) else ""
        return f"`replace_file_content`: `{path}`{line_info}"
        
    elif clean_name == "multi_replace_file_content":
        path = args.get("TargetFile", "")
        chunks = args.get("ReplacementChunks", [])
        num_chunks = len(chunks) if isinstance(chunks, list) else "?"
        return f"`multi_replace_file_content`: `{path}` ({num_chunks} chunks)"
        
    elif clean_name == "write_to_file":
        path = args.get("TargetFile", "")
        code = str(args.get("CodeContent", ""))
        lines_count = len(code.splitlines())
        return f"`write_to_file`: `{path}` ({lines_count} lines)"
        
    elif clean_name == "run_command":
        cmd = args.get("CommandLine", "").strip()
        if len(cmd) > 120:
            cmd = cmd[:120] + "..."
        return f"`run_command`: `{cmd}`"
        
    elif clean_name == "grep_search":
        query = args.get("Query", "")
        path = args.get("SearchPath", "")
        return f"`grep_search`: query='{query}' in `{path}`"
        
    elif clean_name == "list_dir":
        path = args.get("DirectoryPath", "")
        return f"`list_dir`: `{path}`"
        
    elif clean_name == "invoke_subagent":
        subagents = args.get("Subagents", [])
        if isinstance(subagents, str):
            try:
                subagents = json.loads(subagents)
            except Exception:
                subagents = []
        roles = []
        if isinstance(subagents, list):
            for sa in subagents:
                roles.append(sa.get("Role", sa.get("TypeName", "subagent")))
        return f"`invoke_subagent`: Roles=[{', '.join(roles)}]"
        
    elif clean_name == "send_message":
        recip = args.get("Recipient", "")
        return f"`send_message`: recipient=`{recip}`"
        
    elif clean_name == "read_url_content":
        url = args.get("Url", "")
        return f"`read_url_content`: `{url}`"
        
    else:
        keys_summary = []
        for k, v in args.items():
            if k in ("toolAction", "toolSummary"):
                continue
            v_str = str(v)
            if len(v_str) > 40:
                v_str = v_str[:40] + "..."
            keys_summary.append(f"{k}={v_str}")
        return f"`{clean_name}`: {', '.join(keys_summary[:3])}"


def render_markdown_trace(root_nodes: List[ConversationNode], run_name: str) -> str:
    lines = []
    lines.append(f"# Agent Run Execution Trace: {run_name}")
    lines.append(f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
    
    all_nodes = []
    for r in root_nodes:
        all_nodes.extend(collect_all_nodes(r))
        
    total_steps = sum(len(n.steps) for n in all_nodes)
    total_subagents = len(all_nodes) - len(root_nodes)
    total_errors = sum(n.error_count for n in all_nodes)
    
    all_skills = set()
    all_tools: Dict[str, int] = {}
    for n in all_nodes:
        all_skills.update(n.skills_used)
        for t, count in n.tool_summary.items():
            all_tools[t] = all_tools.get(t, 0) + count

    lines.append("## 1. Executive Execution Hierarchy & Stats\n")
    lines.append(f"- **Total Conversations Tracked:** {len(all_nodes)} ({len(root_nodes)} Root, {total_subagents} Subagents)")
    lines.append(f"- **Total Steps Recorded:** {total_steps}")
    lines.append(f"- **Total Errors / Retries:** {total_errors}")
    lines.append(f"- **Skills Activated:** {', '.join(sorted(all_skills)) if all_skills else 'None detected'}")
    lines.append("\n### Tool Invocations Summary")
    lines.append("| Tool Name | Invocation Count |")
    lines.append("|---|---|")
    for t_name, count in sorted(all_tools.items(), key=lambda x: x[1], reverse=True):
        lines.append(f"| `{t_name}` | {count} |")
        
    lines.append("\n### Conversation Graph")
    def print_tree(node: ConversationNode, depth: int = 0):
        indent = "  " * depth
        lines.append(f"{indent}- **{node.role}** (`{node.conv_id}`) — {len(node.steps)} steps | Skills: {', '.join(node.skills_used) if node.skills_used else 'none'}")
        for child in node.children:
            print_tree(child, depth + 1)
            
    for r in root_nodes:
        print_tree(r, depth=0)
        
    lines.append("\n" + "=" * 80 + "\n")
    lines.append("## 2. Chronological Conversation Step Log\n")
    
    for idx, node in enumerate(all_nodes, 1):
        lines.append(f"### Node {idx}/{len(all_nodes)}: {node.role}")
        lines.append(f"- **Conversation ID:** `{node.conv_id}` | **Parent ID:** `{node.parent_id or 'None (Root)'}`")
        lines.append(f"- **Duration:** `{node.start_time or 'N/A'}` → `{node.end_time or 'N/A'}` ({len(node.steps)} steps)")
        lines.append("")
        
        for s in node.steps:
            s_idx = s.get("step_index", "?")
            s_type = s.get("type", "UNKNOWN")
            s_status = s.get("status", "OK")
            
            # Special handling by step type
            if s_type == "USER_INPUT":
                content = str(s.get("content", "")).strip()
                if len(content) > 300:
                    content = content[:300] + "... [Truncated]"
                lines.append(f"- **Step {s_idx} [USER Prompt]:** {content}")
                
            elif s_type == "PLANNER_RESPONSE":
                tool_calls = s.get("tool_calls", [])
                thinking = str(s.get("thinking", "")).strip()
                
                if tool_calls:
                    for tc in tool_calls:
                        summary = summarize_tool_call(tc.get("name", ""), tc.get("args", {}))
                        lines.append(f"- **Step {s_idx} [Tool Call]:** {summary}")
                else:
                    think_snippet = thinking[:150] + "..." if len(thinking) > 150 else thinking
                    lines.append(f"- **Step {s_idx} [Response]:** {think_snippet or 'Completed turn.'}")
                    
            elif s_status == "ERROR" or "error" in str(s.get("content", "")).lower():
                content_err = str(s.get("content", "")).strip()
                first_err_line = content_err.splitlines()[0] if content_err else "Error encountered"
                if len(first_err_line) > 200:
                    first_err_line = first_err_line[:200] + "..."
                lines.append(f"- **Step {s_idx} [{s_type}] ⚠️ ERROR:** `{first_err_line}`")
                
            else:
                # Normal tool execution result / step: 1 concise status line
                lines.append(f"- **Step {s_idx} [{s_type}]:** Status: `{s_status}`")
                
        lines.append("\n" + "-" * 60 + "\n")
        
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Harvest and aggregate agent conversation logs into concise trace.")
    parser.add_argument("--root-id", nargs="+", required=True, help="One or more root conversation IDs")
    parser.add_argument("--run-name", default="Agent_Run", help="Name or label of the run")
    parser.add_argument("--output", help="Output file path for Markdown trace")
    parser.add_argument("--brain-dir", default=DEFAULT_BRAIN_DIR, help="Path to brain logs directory")
    parser.add_argument("--full", action="store_true", help="Use transcript_full.jsonl instead of transcript.jsonl")
    
    args = parser.parse_args()
    
    visited: Set[str] = set()
    root_nodes: List[ConversationNode] = []
    
    for r_id in args.root_id:
        print(f"Processing root conversation: {r_id}...")
        node = parse_conversation(
            args.brain_dir,
            r_id,
            parent_id=None,
            role="Root Agent",
            visited=visited,
            use_full=args.full
        )
        if node:
            root_nodes.append(node)
            
    if not root_nodes:
        print("[Error] No valid conversation logs found for given root ID(s).", file=sys.stderr)
        sys.exit(1)
        
    trace_markdown = render_markdown_trace(root_nodes, args.run_name)
    
    if args.output:
        out_path = args.output
    else:
        os.makedirs("specs/audits", exist_ok=True)
        safe_name = re.sub(r"[^\w\-]", "_", args.run_name.lower())
        out_path = f"specs/audits/{safe_name}_trace.md"
        
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(trace_markdown)
        
    print(f"Successfully generated compact trace artifact at: {out_path}")
    print(f"Total conversations parsed: {len(visited)}")


if __name__ == "__main__":
    main()
