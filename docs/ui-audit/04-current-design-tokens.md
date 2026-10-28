# 04 - Current Design Tokens

**Audit Date:** 2026-10-28  
**Source:** client/src/index.css (VERIFIED), client/index.html (VERIFIED), inspected components (VERIFIED).

## 4.1 Colors (VERIFIED from index.css @theme and usage)

### CSS Custom Properties (@theme)
| Token | Value | Usage (from codebase) |
|-------|-------|----------------------|
| --color-brand-dark | #0b192c | Brand/dark elements (AppShell header accents, login button bg, some nav) |
| --color-brand-primary | #0f172a | Primary brand color |
| --color-brand-accent | #d97706 | Accent (amber) |
| --color-brand-accent-hover | #b45309 | Accent hover |
| --color-page-bg | #fbfaf8 | Page background (body, AppShell) |
| --color-card-bg | #ffffff | Card backgrounds |
| --color-sidebar-bg | #ffffff | Sidebar background |
| --color-sidebar-active | #eef2f6 | Active nav item background |
| --color-border-subtle | #e5e7eb | Subtle borders |
| --color-border-light | #f1f5f9 | Light borders |
| --color-text-main | #0f172a | Main text |
| --color-text-muted | #64748b | Muted text |
| --color-text-subtle | #94a3b8 | Subtle text |

### Common Tailwind/Hex values observed
| Color | Hex | Observed Usage |
|-------|-----|----------------|
| White | #ffffff | Cards, header, sidebar |
| Page bg (alt) | #f8f9fa | AppShell body, login bg, some containers |
| Slate scale | slate-50/100/200/300/400/500/600/700/800/900 | Borders, text, backgrounds throughout |
| Blue (primary actions) | #2563eb, #1d4ed8, #1e40af, blue-600/700/800/900 | Links, buttons, badges |
| Navy chart bars | #0f2b48, #1e3a8a | Dashboard maturity bars |
| Green/emerald | #16a34a, emerald-50/600/700/800 | Active status, success |
| Amber/orange | #d97706, #b45309, #f59e0b, amber-50/600/700/800 | Accents, warnings, release requested |
| Red/rose | #b91c1c, #dc2626, rose-50/200/600/700/800 | Errors, matured overdue |
| Sky | #0284c7, sky-400/600/700 | Some accents |

## 4.2 Typography (VERIFIED)
| Property | Value | Source |
|----------|-------|--------|
| Font family | "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif | index.css:32, index.html:15-18 |
| Weights loaded | 400,500,600,700 | index.html:16 |
| Rendering | -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale | index.css:44-45 |
| Color scheme | light enforced | index.html:2,6; index.css:38,43 |

Observed sizes (from classes): text-[10px] up to text-2xl/3xl; common text-xs, text-sm, text-base. Font weights 400-800.

## 4.3 Spacing, Layout, Borders, Radius, Shadows (VERIFIED)
| Element | Values Observed | Notes |
|---------|-----------------|-------|
| Border radius | rounded-md/lg/xl/2xl, --radius-card: 0.75rem (0.75rem) | Cards often rounded-xl (0.75rem) |
| Borders | border border-slate-200/90, border-slate-300 | Subtle borders throughout |
| Shadows | shadow-xs, shadow-sm, shadow-[0_2px_12px_rgba(0,0,0,0.04)] | Very subtle shadows |
| Spacing | gap-1.5/2/3/4/6, p-2/3/4/6, py-2/2.5/3/4/6/8, px-2.5/3/4/6/8/9 | Tailwind spacing scale |
| Layout widths | max-w-[1600px] shell, max-w-7xl content, sidebar w-56 lg:w-60, header h-15 | As in AppShell |
| Grids | grid-cols-1 lg:grid-cols-2, grid-cols-2 md:grid-cols-4 | Responsive grids |

## 4.4 Components Styling (VERIFIED)
- **Buttons:** Mix of solid (navy #0b192c), blue-700, outlined with slate borders; rounded-lg/xl; text-xs/sm; subtle transitions.
- **Inputs:** rounded-xl, border-slate-300, focus ring blue-600/20, focus border-blue-600.
- **Cards:** bg-white, border border-slate-200/90, rounded-xl, shadow-xs.
- **Tables:** slate-50 header, divide-y divide-slate-100, hover:bg-slate-50/80.
- **Badges:** pill/rounded with semantic colors and borders.
- **Active nav:** bg-[#eef2f6], amber left bar (w-1 bg-amber-600).
- **Charts:** Inline SVG in DashboardPage with specific colors (blue #2563eb, green #16a34a, amber #b45309, navy #0f2b48).

## 4.5 Responsive Breakpoints (INFERRED from classes)
Uses Tailwind responsive prefixes: sm, md, lg (e.g., hidden lg:flex, sm:px-6, md:grid-cols-4). Breakpoints follow Tailwind defaults (sm:640px, md:768px, lg:1024px). NOT explicitly tested in browser per read-only rules.

## 4.6 Notes
- Design leans toward clean corporate/government-style aesthetic with restrained palette. Logo is present. Demo data notices appear. No custom CSS animations beyond transitions/spinners; custom scrollbars styled.
