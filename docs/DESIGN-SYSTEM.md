# UIU Alumni Portal — Design System Specification

## 1. Overview & Visual Identity

The UIU Alumni Portal design system provides a clean, modern, consistent, and responsive user experience based on United International University's brand identity.

- **Primary Brand Color**: UIU Orange / Warm Red-Orange (`#FF5722` / `#FA4B2A`)
- **Page Background**: Soft Warm Cream (`#FFF7F0`)
- **Card Background**: Pure White (`#FFFFFF`) with subtle border (`#F1E5D8`) and soft elevation shadow.
- **Dark Footer**: Deep Navy (`#0C1427`) with thin top border.
- **Top Bar Indicator**: Thin 3px orange accent line at the absolute top of the viewport.
- **Typography**: 
  - Headings: `Poppins`, sans-serif (Weights: 600, 700)
  - Body: `Inter`, sans-serif (Weights: 400, 500, 600)

---

## 2. CSS Design Tokens (`/css/tokens.css`)

```css
:root {
  /* Brand Colors */
  --color-primary: #FF5722;
  --color-primary-hover: #E64A19;
  --color-primary-light: #FFF0EB;
  --color-primary-gradient: linear-gradient(135deg, #FF5722 0%, #FA4B2A 100%);
  --color-primary-gradient-hover: linear-gradient(135deg, #E64A19 0%, #E03E1A 100%);

  /* Secondary & Neutral Colors */
  --color-bg-page: #FFF7F0;
  --color-bg-card: #FFFFFF;
  --color-bg-subtle: #FDF9F5;
  --color-bg-dark: #0C1427;

  --color-text-main: #1E293B;
  --color-text-muted: #64748B;
  --color-text-light: #94A3B8;
  --color-text-white: #FFFFFF;

  --color-border: #E2E8F0;
  --color-border-light: #F1E5D8;

  /* Status Colors */
  --color-success: #10B981;
  --color-success-bg: #ECFDF5;
  --color-warning: #F59E0B;
  --color-warning-bg: #FFFBEB;
  --color-danger: #EF4444;
  --color-danger-bg: #FEF2F2;
  --color-info: #2563EB;
  --color-info-bg: #EFF6FF;

  /* Typography */
  --font-heading: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  --font-size-xs: 0.75rem;     /* 12px */
  --font-size-sm: 0.875rem;    /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg: 1.125rem;    /* 18px */
  --font-size-xl: 1.25rem;     /* 20px */
  --font-size-2xl: 1.5rem;     /* 24px */
  --font-size-3xl: 1.875rem;   /* 30px */
  --font-size-4xl: 2.25rem;    /* 36px */

  /* Spacing */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-12: 3rem;    /* 48px */

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 25px -5px rgba(0, 0, 0, 0.08);
  --shadow-modal: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  /* Layout */
  --max-width: 1240px;
  --header-height: 72px;
}
```

---

## 3. UI Component Registry

Every component in the UIU Alumni Portal is standardized across all views:

1. **Navbar Component (`navbar.js`)**
   - Displays 3px top orange line.
   - Dynamic render based on Role (`guest`, `student`, `alumni`, `admin`).
   - Active page highlighted with bottom orange bar / primary text color.
   - Responsive hamburger menu for mobile (< 768px).
   - User profile dropdown menu (My Profile, Settings, Logout).

2. **Footer Component (`footer.js`)**
   - Single dark navy footer (`--color-bg-dark`).
   - Logo, brief mission statement, Quick Links, Contact details, Copyright line.

3. **Buttons (`components.css`)**
   - `.btn-primary`: Orange gradient background, white text, hover lift effect.
   - `.btn-secondary`: White background, subtle border, dark text.
   - `.btn-outline`: Transparent background, primary orange border & text.
   - `.btn-danger`: Red background/border for destructive actions.
   - `.btn-success`: Green background/border for approvals.
   - `.btn-ghost`: Subtle hover background.
   - `.btn-icon`: Circular or square icon container.

4. **Form Controls (`components.css`)**
   - Standardized input fields, textareas, custom select boxes, checkboxes, toggle switches.
   - Password inputs with toggleable eye icon for Show/Hide password.
   - Field wrapper with label, hint text, and validation error message state.

5. **Cards (`cards.js` & `components.css`)**
   - Base Card: Clean white card, 16px radius, border `#F1E5D8`, soft shadow.
   - Job Card: Title, company logo/badge, tags (location, type, salary), posted date, view/apply buttons.
   - Event Card: Date badge chip, title, description preview, venue/online tag, attendee count, register button.
   - Mentor Card: Avatar, name, title @ company, department/batch, skills tags, Profile & Mentorship request buttons.
   - Stat Card: Clean number count + description icon.

6. **Badges / Status Pills (`components.css`)**
   - Status indicators: `Pending` (amber/blue), `Approved` / `Accepted` (green), `Rejected` / `Declined` (red), `Open` / `Closed`.
   - Role badges: `Alumni` (orange), `Student` (indigo), `Admin` (slate).

7. **Modal & Confirm Dialog (`modal.js`)**
   - Accessible modal overlay backdrop.
   - Standard Modal, Confirm Dialog, and `Success Modal` (with orange check icon circle, formatted text, and action button).

8. **Toast Notifications (`toast.js`)**
   - Floating notification popups (success, error, info) auto-dismissing after 3 seconds.

9. **Timeline (`timeline.js`)**
   - Vertical career/education timeline used in Alumni Profile and Settings.

10. **Tabs & Search / Filter Bar (`components.css`)**
    - Navigation tab bars for filtering views.
    - Integrated search input with filter dropdowns.

11. **Icon Library & SVG Standard (`utils.js`)**
    - Inline Lucide-style SVG icons (`getIcon(name)` with `stroke="currentColor"`, 1.75 stroke width).
    - Emoji characters are strictly excluded from UI for cross-platform visual consistency.
    - Accessible password visibility toggle (`eye` / `eyeOff` SVGs).

12. **Prototype Layout & Reusable Card Extensions (`components.css`)**
    - **Filter Sidebar (`.layout-sidebar-main`)**: 300px sticky filter sidebar card on left (keywords, radio groups, location input) and main content grid on right.
    - **Featured Event Banner (`.featured-event-banner`)**: Full-width dark-orange gradient banner, event details, and browser-generated `.ics` calendar file download.
    - **Fund Drive Card**: Tinted icon box, fund description, live total BDT donated and donor count stats (General, Scholarship, Emergency funds).
    - **Modern Mentor Card (`.mentor-card`)**: 72px avatar with gradient ring (`.avatar-ring`), green Available pill, verified blue checkmark, role @ company line, graduation-cap department/batch line, expertise chips, View Profile & Request Mentorship buttons.
    - **Underline Highlight (`.highlight-underline`)**: Hand-drawn soft orange highlight accent under key heading words.
