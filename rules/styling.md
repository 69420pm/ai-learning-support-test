# UI & Styling Guidelines

This document specifies frontend styling patterns, Tailwind CSS v4 design tokens, theme variables, and responsive layout standards for **AI Learning Support**.

> 💡 **Component Mechanics & CLI Operations**:
> For adding, searching, or composing UI primitives (buttons, cards, forms, dialogs, sidebars, chat interfaces), refer to the workspace skill: [`.agents/skills/shadcn/SKILL.md`](file:///workspaces/secure-ai-learning-support/.agents/skills/shadcn/SKILL.md).

---

## 1. Tailwind CSS v4 Architecture

* **Engine Configuration:** Rely strictly on Tailwind CSS v4. Do NOT create or look for a `tailwind.config.js` file.
* **Global CSS Imports:** CSS directives and theme variables are defined in [`app/globals.css`](file:///workspaces/secure-ai-learning-support/app/globals.css):
  ```css
  @import "tailwindcss";
  @plugin "tailwindcss-animate";

  @custom-variant dark (&:is(.dark, .dark *));
  ```
* **Theme Tokens:** Custom properties and radii map inline under `@theme inline` in [`app/globals.css`](file:///workspaces/secure-ai-learning-support/app/globals.css):
  ```css
  @theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-primary: var(--primary);
    --color-muted: var(--muted);
    --radius-md: calc(var(--radius) - 2px);
  }
  ```

---

## 2. OKLCH Design Tokens & Dark Mode

* **Color Format:** Express theme color tokens using the `oklch` color space in `:root` and `.dark` blocks in [`app/globals.css`](file:///workspaces/secure-ai-learning-support/app/globals.css).
* **Semantic Color Usage:** Use functional semantic class names (`bg-background`, `text-foreground`, `bg-primary`, `border-border`, `text-muted-foreground`) rather than static utility colors (e.g. `bg-gray-100` or raw hex codes).
* **Dark Mode Strategy:** Class-based dark mode (`.dark`) managed via `next-themes` (`ThemeProvider`).

```css
:root {
  --radius: 0.625rem;
  --background: oklch(0.985 0 0);
  --foreground: oklch(0.12 0 0);
  --primary: oklch(0.205 0 0);
  --muted-foreground: oklch(0.55 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --muted-foreground: oklch(0.7 0 0);
}
```

---

## 3. Class Merging & Custom Styling Rules

* **Class Merging:** Always merge dynamic class names using [`cn(...)`](file:///workspaces/secure-ai-learning-support/lib/utils.ts#L4) from `@/lib/utils` (wrapping `clsx` and `tailwind-merge`).
* **Layout vs. Component Styling:** Use `className` on components for positioning/layout (`flex`, `grid`, `m-*`), not for overriding internal component colors or typography tokens.
* **Flex Spacing over `space-y-*`:** Use `flex flex-col gap-*` or `flex gap-*` for element spacing instead of legacy `space-x-*` / `space-y-*`.
* **Sizing Shorthand:** Use `size-*` for elements with equal width and height (`size-4`, `size-10`) rather than `w-4 h-4`.

---

## 4. Animations, Typography & Icons

* **Spring Animations:** Utilize custom cubic-bezier easing tokens (`--ease-spring: cubic-bezier(0.22, 1, 0.36, 1)`) and `@plugin "tailwindcss-animate"` for smooth UI micro-interactions.
* **Rich Typography:** Format streamed AI markdown and pedagogical text outputs using `@tailwindcss/typography` (`prose dark:prose-invert`).
* **Icons:** Use `lucide-react` exclusively for visual icon elements.
* **Focus States & Accessibility:** Ensure standard interactive elements retain visible focus rings (`ring-ring focus-visible:outline-none focus-visible:ring-2`).

---

## 5. Responsive Design Standards

- Follow a **mobile-first** approach: base styles target mobile, use `sm:`, `md:`, `lg:`, `xl:` breakpoints to scale up.
- Standard breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).
- Use Tailwind's responsive prefixes consistently: `className="px-4 md:px-8 lg:px-12"`.
- Container widths: use `max-w-4xl` for focused content/learning areas, `max-w-7xl` for full dashboard layouts.
- Test all UI changes across mobile (375px), tablet (768px), and desktop (1280px) viewport widths.
