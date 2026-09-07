---
name: figma
description: Figma design and translation. Use when collaborating on UI mockups in Figma, converting Figma frames into Tailwind CSS v4 and shadcn/ui code, reading design tokens, or validating UI implementation against a Figma link.
---

# Figma Integration & Design-to-Code

This skill guides Antigravity agents through collaborating on Figma UI mockups, inspecting Figma designs, translating them into production-ready Next.js code, and validating the visual implementation.

---

## 1. Operating Modes

1. **Pair-Designing Mockups**: Collaboratively constructing UI frames and components directly in Figma before writing code.
2. **Design-to-Code Implementation**: Autonomous reading and translation of Figma frames into clean React, Tailwind CSS v4, and shadcn/ui components.
3. **Visual Fidelity Verification**: Comparing live browser output captured via `agent-browser` against the source Figma frame.

---

## 2. MCP Tools & Environment

Figma tools are provided via the **Figma MCP Server** (`figma` in `~/.gemini/config/mcp_config.json`):

- **Remote Server (Default)**: `https://mcp.figma.com/mcp` (Figma's official hosted endpoint with OAuth).
- **Desktop Dev Mode (Local)**: `http://127.0.0.1:3845/mcp` (when running the Figma desktop app).
- **Stdio Fallback**: `@modelcontextprotocol/server-figma` using `FIGMA_PERSONAL_ACCESS_TOKEN`.

### Key MCP Capabilities
- **Read / Inspect**: `get_file`, `get_node`, `get_image` — inspect layout hierarchy, auto-layout constraints, color styles, and export frame images.
- **Write / Canvas**: `use_figma`, `generate_figma_design` — create and manipulate native frames, text, auto-layout containers, and component instances.

---

## 3. Workflow A: Pair-Designing Mockups in Figma

When the user wants to design a feature's UI in Figma before or during specification:

1. **Establish Canvas Parameters**:
   - Standard mobile viewport: **375px** width.
   - Standard desktop viewport: **1280px** width.
   - Base grid: strict **4px / 8px** increment scale.
2. **Use Shared Design Tokens**:
   - Color variables: strictly map to project semantic names (`Background`, `Foreground`, `Primary`, `Muted`, `Border`, `Destructive`).
   - Radii: base 10px (`--radius`), medium 8px (`--radius-md`), small 6px (`--radius-sm`).
3. **Structure with Auto-Layout**:
   - Always use Auto-Layout (`VERTICAL` or `HORIZONTAL`). Avoid free-floating, absolute-positioned elements unless genuinely floating (e.g. badges, tooltips).
   - Set container resizing to `FILL_CONTAINER` for responsive children or `HUG_CONTENTS` for buttons/chips.
4. **Instantiate Standard Primitives**:
   - Model cards, buttons, inputs, dialogs, and navigation after existing shadcn components (`components/ui/*`).
5. **Output Frame Reference**:
   - Provide or copy the direct Figma node URL (`https://www.figma.com/design/<file_key>/<title>?node-id=<node_id>`) so it can be embedded directly into the issue or feature spec.

---

## 4. Workflow B: Converting Figma to Code (Implementer)

When an issue or spec provides a Figma link (`figma.com/design/...` or `figma.com/file/...`):

### Step 1: Extract & Export Frame Visuals
1. Parse the `file_key` and `node_id` from the URL.
2. If Figma MCP image tools are available, export a rendered PNG of the frame to the scratch directory (e.g., `<appDataDir>/scratch/figma-<node_id>.png`).
3. Inspect the image with `view_file` to gain immediate visual context of spacing, typography weight, hierarchy, and component composition.

### Step 2: Read Node Auto-Layout & Properties
Query the node details through the Figma MCP tool (`get_node` or equivalent):
- **Layout Direction**: `HORIZONTAL` $\rightarrow$ `flex flex-row`, `VERTICAL` $\rightarrow$ `flex flex-col`.
- **Item Spacing (Gap)**:
  - 4px $\rightarrow$ `gap-1`
  - 8px $\rightarrow$ `gap-2`
  - 12px $\rightarrow$ `gap-3`
  - 16px $\rightarrow$ `gap-4`
  - 24px $\rightarrow$ `gap-6`
  - 32px $\rightarrow$ `gap-8`
- **Padding**: Map top/right/bottom/left padding to `p-*`, `px-*`, `py-*` using standard Tailwind spacing scale.
- **Alignment**:
  - Primary axis `CENTER` $\rightarrow$ `justify-center`, `SPACE_BETWEEN` $\rightarrow$ `justify-between`.
  - Counter axis `CENTER` $\rightarrow$ `items-center`, `STRETCH` $\rightarrow$ `items-stretch`.
- **Resizing**:
  - `FILL` $\rightarrow$ `flex-1` or `w-full`.
  - `HUG` $\rightarrow$ `w-fit`.
  - Fixed dimensions $\rightarrow$ `size-*` if equal (e.g., `size-10`), or `w-[*] h-[*]`.

### Step 3: Map to Existing shadcn Primitives
Always check [`rules/styling.md`](file:///workspaces/secure-ai-learning-support/rules/styling.md) and [`.agents/skills/shadcn/SKILL.md`](file:///workspaces/secure-ai-learning-support/.agents/skills/shadcn/SKILL.md) before writing custom markup:
- **Buttons**: `<Button variant="..." size="...">` from `@/components/ui/button`.
- **Cards**: `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>` from `@/components/ui/card`.
- **Inputs & Forms**: `<FieldGroup>`, `<Field>`, `<FieldLabel>`, `<Input>` from `@/components/ui/*`.
- **Badges**: `<Badge variant="...">` from `@/components/ui/badge`.
- **Icons**: Lucide icons from `lucide-react` (e.g., `<SearchIcon data-icon="inline-start" />`).
- **Typography**: Semantic heading elements (`h1`, `h2`, `h3`, `p`) styled with functional Tailwind typography classes.

### Step 4: Semantic Color Token Mapping
Never use raw hex colors (`#...`) or hardcoded utility scales (`bg-gray-100`). Always use semantic theme classes:
- Background: `bg-background`
- Surface / Card: `bg-card text-card-foreground`
- Primary CTA: `bg-primary text-primary-foreground`
- Muted text / borders: `text-muted-foreground`, `border-border`

---

## 5. Workflow C: Headless Browser UI Verification

To objectively verify the implemented UI against the Figma mockup:

1. **Launch `agent-browser`**:
   Ensure `next dev` is running, then launch an `agent-browser` session targeting the route.
2. **Viewport Alignment**:
   Match the Figma frame viewport:
   - Mobile: `agent-browser resize --width 375 --height 812`
   - Desktop: `agent-browser resize --width 1280 --height 800`
3. **Capture Annotated Snapshot**:
   ```bash
   agent-browser screenshot --annotate
   ```
4. **Compare & Audit**:
   - Compare the annotated browser screenshot against the exported Figma preview image.
   - Verify alignment, visual weight, font sizes, margins, and contrast in both light and dark themes.
   - Run `pnpm check` to guarantee 0 lint, typecheck, or test errors.

---

## 6. Critical Rules

- **Do NOT invent custom raw HTML** when a shadcn component exists.
- **Do NOT use `space-x-*` or `space-y-*`** — use `flex flex-col gap-*` or `flex gap-*`.
- **Do NOT hardcode colors** — all colors must resolve to semantic CSS variables in `app/globals.css`.
- **Always preserve mobile responsiveness** — start from mobile layout and use `sm:`, `md:`, `lg:` prefixes to scale up.
