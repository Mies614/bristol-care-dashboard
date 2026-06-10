# Bristol Care Dashboard Design System

## Tone
- warm, calm, intimate but not childish
- mobile-first, soft premium
- gentle and clear, not overly sweet

## Radius
- card: `var(--app-radius)` (typically 1rem–1.5rem)
- button: `var(--app-radius)` or `rounded-full`
- media: 1.25rem
- sheet/dialog: 1.75rem top only

## Shadow
- cards: `shadow-[var(--app-card-shadow)]` (soft, low opacity)
- avoid heavy drop shadows
- float: shadow-float for elevated content (lightbox, sheet)

## Color Roles (CSS Variables)
- `--app-bg`: page background
- `--app-bg-soft`: secondary background
- `--app-card-bg`: card background
- `--app-card-border`: card border
- `--app-card-shadow`: card shadow color
- `--app-text`: primary text
- `--app-muted`: secondary/muted text
- `--app-accent`: primary accent (rose/pink)
- `--app-accent-soft`: accent background
- `--app-btn-bg`: primary button background
- `--app-danger`: danger/delete color
- `--tap-scale`: 0.97 (press feedback)

## Interaction
- tap feedback: `active:scale-[var(--tap-scale)]` (0.97) or opacity 0.85
- transition: 150–250ms, ease-out
- respect `prefers-reduced-motion`

## Touch Targets
- minimum: 40px
- close buttons: 44px
- BottomNav items: 44px

## Copy Guidelines
- clear, gentle, warm
- no excessive emoji
- no overly sweet language
- error: "刚刚没发出去，可以再试一次。"
- fallback: "网络慢了一点，先帮你存在本机。"
- empty: "还没有评论，先说点什么吧。"

## UI Primitives

### Existing (wrapping shadcn/ui)

| Component | Path | Variants |
|---|---|---|
| AppCard | `components/ui/AppCard.tsx` | default, highlight, soft, paper, danger, photo |
| AppButton | `components/ui/AppButton.tsx` | primary, secondary, ghost, danger, soft |
| AppSection | `components/ui/AppSection.tsx` | default, card, clean (collapsible) |
| AppEmptyState | `components/ui/AppEmptyState.tsx` | icon, title, description, action |
| AppBadge | `components/ui/AppBadge.tsx` | default, accent, success, warning, danger, info |
| AppFormField | `components/ui/AppFormField.tsx` | label + input + error |

### New (Round 4)

| Component | Path | Purpose |
|---|---|---|
| PageHeader | `components/ui/PageHeader.tsx` | Page title + subtitle + action |
| StatusPill | `components/ui/StatusPill.tsx` | Unread, success, warning, owner/partner labels |
| ActionTile | `components/ui/ActionTile.tsx` | Icon + title + description, chevron, whole-card clickable |
| UnreadBadge | `components/ui/UnreadBadge.tsx` | Dot or label mode for unread indicators |
| MediaActionButton | `components/ui/MediaActionButton.tsx` | Download button with media-type icon |
| MobileSheet | `components/ui/MobileSheet.tsx` | Bottom sheet with title, close button, safe area |

## Available Shadcn Primitives

Located at `components/ui/`: button, card, dialog, badge, input, textarea, select, switch, tabs, separator, tooltip, alert-dialog, accordion, dropdown-menu, slider, toast

## Usage Rules

1. Prefer App* wrappers over bare shadcn in business components
2. AppCard for all card containers, AppButton for all buttons
3. Never bypass App primitives to use raw shadcn in page-level components
4. All new UI primitives go in `components/ui/`
5. Keep imports clean: `@/components/ui/ComponentName`

## Side-Aware Accents (Round 10)

### Principles
- **Partner side** (小乖端, `/**`): warm rose/cream/blush, paper-like, gentle
- **Owner side** (我端, `/me/**`): subtle violet/indigo, gentle dashboard
- Both sides share the same design tokens; accents are lightweight overlays
- Never let the two sides look like completely different products

### Components with side-aware support
| Component | Path | Side-Aware Feature |
|---|---|---|
| BottomNav | `components/navigation/BottomNav.tsx` | `data-side` attribute, active pill color (partner=rose, owner=indigo) |
| PageHeader | `components/ui/PageHeader.tsx` | `appSide` prop for icon accent color |
| StatusPill | `components/ui/StatusPill.tsx` | `owner` and `partner` variants |
| AppCard | `components/ui/AppCard.tsx` | Used with gradient backgrounds per side |

### When NOT to use strong accents
- Empty states (use neutral/muted tones)
- Loading skeletons (use neutral)
- Error messages (use danger variant only for critical errors)
- Data tables and admin panels

## Motion Rules (Round 10)

### Tap/Hover Feedback
- Tap: `active:scale-[0.97]` or opacity 0.85
- Hover: subtle scale 1.01 or background lighten
- Transition: 150–250ms, ease-out

### Reduced Motion
- Always check `prefers-reduced-motion` via `useAccessibleMotion()`
- When reduced: disable scale animations, use opacity-only transitions
- When reduced: set animation duration to 0

### BottomNav Motion
- Active pill slides between tabs (spring animation, disabled for reduced motion)
- Icon scales up 1.12x on active
- Label fades in/out smoothly

## Touch Target Rules (Round 10)
- Buttons in navigation: ≥ 44px
- Action buttons: ≥ 40px
- Close buttons (sheets/lightbox): 44px
- File input labels: use sr-only input + visible styled label
- All interactive elements must have aria-label

## Safe Area (Round 10)
- AppShell: `pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]`
- BottomNav: `pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]`
- MobileSheet: `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`
- All fixed-bottom elements must account for safe-area
