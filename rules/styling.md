# UI & Styling Guidelines

This document specifies frontend styling patterns, Tailwind CSS v4 architecture, component design tokens, and dark mode handling for **AI Learning Support**.

---

## 1. Tailwind CSS v4 Architecture

* **Engine Configuration:** Rely strictly on Tailwind CSS v4. Do NOT create or look for a `tailwind.config.js` file.
* **Global CSS Imports:** CSS directives and theme variables are defined in `app/globals.css`:
  ```css
  @import "tailwindcss";
  @plugin "tailwindcss-animate";
  @plugin "@tailwindcss/typography";

  @custom-variant dark (&:is(.dark, .dark *));
  ```
* **Theme Tokens:** Custom properties and radii map inline under `@theme inline`:
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

* **Color Format:** Express theme color tokens using the `oklch` color space in `:root` and `.dark` blocks in `app/globals.css`.
* **Semantic Color Usage:** Use functional semantic class names (`bg-background`, `text-foreground`, `bg-primary`, `border-border`, `text-muted-foreground`) rather than static utility colors (e.g. `bg-gray-100`).
* **Dark Mode Strategy:** Class-based dark mode (`.dark`) managed via `next-themes` (`ThemeProvider`).

```css
:root {
  --radius: 0.625rem;
  --background: oklch(0.985 0 0);
  --foreground: oklch(0.12 0 0);
  --primary: oklch(0.12 0 0);
  --muted-foreground: oklch(0.58 0 0);
}

.dark {
  --background: oklch(0.195 0 0);
  --foreground: oklch(0.94 0 0);
  --primary: oklch(0.985 0 0);
  --muted-foreground: oklch(0.7 0 0);
}
```

---

## 3. Component Styling & Class Merging

* **`cn()` Utility:** Always merge dynamic class names using `cn(...)` from `@/lib/utils` (which wraps `clsx` and `tailwind-merge`).
  ```typescript
  import { cn } from "@/lib/utils";

  export function Button({ className, variant, ...props }: ButtonProps) {
    return (
      <button className={cn("inline-flex items-center justify-center rounded-md px-4 py-2", className)} {...props} />
    );
  }
  ```
* **Variants with CVA:** Construct reusable component variants using `class-variance-authority` (`cva`).
* **Primitive Layer:** Build core UI primitives on `@radix-ui` unstyled components (`components/ui/*`).

---

## 4. Animations, Typography & Accessibility

* **Spring Animations:** Utilize custom cubic-bezier easing tokens (`--ease-spring: cubic-bezier(0.22, 1, 0.36, 1)`) and `@plugin "tailwindcss-animate"` for smooth UI micro-interactions.
* **Rich Typography:** Format streamed AI markdown and text outputs using `@tailwindcss/typography` (`prose dark:prose-invert`).
* **Icons:** Use `lucide-react` exclusively for visual icon elements.
* **Focus States & Accessibility:** Ensure standard interactive elements retain focus rings (`ring-ring focus-visible:outline-none focus-visible:ring-2`).

---

### Responsive Design

- Follow a **mobile-first** approach: base styles target mobile, use `sm:`, `md:`, `lg:`, `xl:` breakpoints to scale up.
- Standard breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).
- Use Tailwind's responsive prefixes consistently: `className="px-4 md:px-8 lg:px-12"`.
- Container widths: use `max-w-4xl` for content areas, `max-w-7xl` for full-width layouts.
- Test all UI changes at mobile (375px), tablet (768px), and desktop (1280px) widths.
