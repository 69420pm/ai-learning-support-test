#!/usr/bin/env python3
"""
Quick validation script for skills - minimal, zero-dependency version.
Validates SKILL.md frontmatter, naming conventions, and constraints.
"""

import sys
import os
import re
from pathlib import Path

def parse_simple_yaml(yaml_str: str) -> dict:
    """Basic YAML frontmatter parser for key-value pairs (zero dependencies)."""
    result = {}
    lines = yaml_str.splitlines()
    current_key = None
    multiline_lines = []

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue

        # Check for key: value
        key_match = re.match(r'^([a-zA-Z0-9_-]+):\s*(.*)$', line)
        if key_match:
            # Save previous multiline if any
            if current_key and multiline_lines:
                result[current_key] = " ".join(multiline_lines)
                multiline_lines = []

            key, value = key_match.group(1), key_match.group(2).strip()
            # Remove quotes
            if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                value = value[1:-1]

            if value in ('>', '|', '>-', '|-'):
                current_key = key
                multiline_lines = []
            else:
                result[key] = value
                current_key = None
        elif current_key and (line.startswith('  ') or line.startswith('\t')):
            multiline_lines.append(stripped)

    if current_key and multiline_lines:
        result[current_key] = " ".join(multiline_lines)

    return result

def validate_skill(skill_path):
    """Basic validation of a skill directory."""
    skill_path = Path(skill_path)

    # Check directory exists
    if not skill_path.exists() or not skill_path.is_dir():
        return False, f"Directory does not exist: {skill_path}"

    # Check SKILL.md exists
    skill_md = skill_path / 'SKILL.md'
    if not skill_md.exists():
        return False, f"SKILL.md not found in {skill_path}"

    # Read content
    content = skill_md.read_text(encoding='utf-8')
    if not content.startswith('---'):
        return False, "No YAML frontmatter found (must start with '---')"

    # Extract frontmatter
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return False, "Invalid frontmatter format (missing closing '---')"

    frontmatter_text = match.group(1)

    # Try PyYAML if available, else parse_simple_yaml
    try:
        import yaml
        frontmatter = yaml.safe_load(frontmatter_text)
        if not isinstance(frontmatter, dict):
            return False, "Frontmatter must be a YAML dictionary"
    except ImportError:
        frontmatter = parse_simple_yaml(frontmatter_text)

    # Define allowed properties
    ALLOWED_PROPERTIES = {'name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility'}

    # Check for unexpected properties
    unexpected_keys = set(frontmatter.keys()) - ALLOWED_PROPERTIES
    if unexpected_keys:
        return False, (
            f"Unexpected key(s) in SKILL.md frontmatter: {', '.join(sorted(unexpected_keys))}. "
            f"Allowed properties are: {', '.join(sorted(ALLOWED_PROPERTIES))}"
        )

    # Check required fields
    if 'name' not in frontmatter or not frontmatter['name']:
        return False, "Missing required 'name' in frontmatter"
    if 'description' not in frontmatter or not frontmatter['description']:
        return False, "Missing required 'description' in frontmatter"

    # Validate name
    name = str(frontmatter['name']).strip()
    if not re.match(r'^[a-z0-9-]+$', name):
        return False, f"Name '{name}' must be kebab-case (lowercase letters, digits, and hyphens only)"
    if name.startswith('-') or name.endswith('-') or '--' in name:
        return False, f"Name '{name}' cannot start/end with hyphen or contain consecutive hyphens"
    if len(name) > 64:
        return False, f"Name '{name}' is too long ({len(name)} chars). Maximum is 64 characters."

    # Validate directory name matches skill name
    if skill_path.name != name:
        return False, f"Directory name '{skill_path.name}' does not match skill name '{name}'"

    # Validate description
    description = str(frontmatter['description']).strip()
    if '<' in description or '>' in description:
        return False, "Description cannot contain angle brackets (< or >)"
    if len(description) > 1024:
        return False, f"Description is too long ({len(description)} chars). Maximum is 1024 characters."

    # Validate compatibility if present
    if 'compatibility' in frontmatter and frontmatter['compatibility']:
        compatibility = str(frontmatter['compatibility']).strip()
        if len(compatibility) > 500:
            return False, f"Compatibility is too long ({len(compatibility)} chars). Maximum is 500 characters."

    return True, f"✅ Skill '{name}' is valid!"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 quick_validate.py <path_to_skill_directory>")
        sys.exit(1)

    valid, message = validate_skill(sys.argv[1])
    print(message)
    sys.exit(0 if valid else 1)