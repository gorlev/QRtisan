# QRtisan — Product Requirements Document (PRD)

| Field | Value |
| --- | --- |
| Product | QRtisan — a local QR code design workbench that runs in the browser |
| Document version | 0.2 (draft) |
| Date | 2026-10-04 |
| Status | **Pending approval** — product owner approval has not been given yet |
| Approver | Product owner (to be assigned) |
| Scope | This repository: React + Vite client application (`src/`), end-to-end tests (`e2e/`), product behavior |
| Language coverage | UI in Turkish (primary) and natural English |
| Source fidelity | This PRD is grounded in the repository's code and tests; it defines intent and acceptance criteria |
| Release safety | Suitable for public release: only relative repository paths and synthetic `example.com` samples are used; it contains no real personal data, Wi-Fi password, token, or private infrastructure information |

> **Reading note:** This document flags the current state and the work still in
> progress as of 2026-10-04 separately. The integrated **automated** suite passed green
> on 2026-10-04 (see §0 and §13.5); however, real hardware, performance budgets, and the
> public release gate still await manual/parent verification, and no scope counts as
> "shipped" until that verification is done. This PRD is not a CI report; it does not
> freeze numeric test results. The approved mobile "Live mini QR" (TR: "Canlı mini QR")
> implementation has landed in the repository; system language detection has been
> implemented and independently reviewed.

## Status markers

| Marker | Meaning |
| --- | --- |
| ✅ | Implemented — code/test sources exist; final integrated verification is additionally pending |
| 🔄 | Integration/final QA in progress — acceptance criteria have not yet been verified in the final run |
| 🟡 | Approved and implementation is in the repository — awaiting final integrated green and/or real-device verification |
| ⏸️ | Deferred / planned — not started yet |

---

## 0. Implementation status snapshot (2026-10-04)

| Workstream | Status | Current state in the repository | Required for acceptance |
| --- | --- | --- | --- |
| Core product (content, design, export, theme, privacy) | ✅ Implemented | 4 content modes, 7 frames, logo, color/shape, 8 presets, PNG/SVG, scannability warnings, TR/EN, light/dark/system theme; unit test sources are present in the repository (see §13.1) | Integrated automated suite passed green (2026-10-04); on-device scan verification awaits manual testing |
| System language detection (FR-LOC-01…03) | ✅ Implemented (independently reviewed) | `localePreference` + `I18nProvider` + `index.html` pre-paint; first supported language (tr/en) in `navigator.languages` order, otherwise English; the automatic result is not written to `kare-locale` (`src/i18n/localePreference.ts`, `src/i18n/I18nProvider.tsx`, `index.html`) | FR-LOC acceptance criteria; unit + E2E sources exist and passed green in the integrated automated suite (2026-10-04) |
| Desktop sticky layout fix (FR-UI-02) | ✅ Automated QA passed (2026-10-04); independent review accepted; manual hardware pending | Rail height is measured from the top bar's bottom edge and the container block's bottom edge (`src/hooks/useStickyRailHeight.ts`, `src/lib/layout.ts`); the preview card flexes, export is pinned at the bottom, and only warning details scroll. The current `e2e/sticky-preview.spec.ts` verifies the sticky rail below the top bar, an in-viewport canvas, warning items readable without expansion, no horizontal overflow, and PNG download; it passed in the integrated automated suite. Footer-collision protection and post-download page-position behavior were accepted in earlier independent review but are not asserted by the current spec | Measured viewport bound and pinned QR/actions verified in the current automated spec; footer-collision protection remains a product criterion without a dedicated current assertion; real-screen/manual verification pending |
| Mobile "Live mini QR" (FR-MOB) | ✅ Automated QA passed (2026-10-04); independent review accepted; manual hardware pending | `src/components/MobileStudio.tsx`, `src/hooks/useMobileStudioLayout.ts`, `src/styles/mobile-studio.css`, `e2e/mobile-studio.spec.ts`; mobile presentation in the App `<1024` branch. The spec covers 320×568, 390×667/844, and 844×390 viewports; reduced motion; safe area simulated with CSS variables; visual keyboard simulated via `visualViewport`; and 44×44 px touch targets separately at 320×568 and 390×844. It passed in the integrated automated suite; clipping/overflow and top bar behavior were accepted in independent review | §13.3 acceptance matrix verified in the automated run; real-device verification (physical notch/keyboard/camera manual) pending |
| Native phone scan verification | ⏸️ Planned | Only decoder-based automated tests exist (jsQR + ZXing) | Manual scan record with at least 3 real devices/operating systems |
| Performance budget measurement | ⏸️ Planned | Budgets are defined as targets (Section 10); no measurement has been done | Measurement report using the methods in Section 10 |
| Public release gate (PUB-01…10) | ⏸️ Planned (partial) | Controls are defined (Section 19); the working-tree pre-scan showed no verified secret/PII findings; automated network isolation (PUB-08) passed in the integrated suite; `.gitignore` preventive coverage exists (SSH/key/keystore/netrc/aws + root `!/.env.example` exception rule; that file does not exist yet); there is no git history (not evaluated) | The final snapshot must be re-scanned after ongoing edits finish and explicit release authorization is given; git history/product owner approval/release are still not green; this gate is not a security approval |

> **Integrated automated QA (2026-10-04):** The full automated suite — type safety
> (`npm run typecheck`), lint (`npm run lint`), unit tests (`npm run test`), production
> build (`npm run build`), and the full browser E2E suite — passed green without retries.
> The desktop sticky layout (post-download), mobile clipping/overflow, and top bar
> behavior were accepted in independent review. This is **automated** verification; real
> hardware (phone camera, physical keyboard/notch, comprehensive browser matrix),
> performance budget measurement, and the public release gates (PUB-01…10) still await
> manual/parent verification.

**Mobile and desktop presentation split:** Desktop (≥1024 px) uses the two-column
sticky rail, while below 1024 px uses a separate mobile studio. The two presentations
share the same source of state (slot-based); the mobile presentation does not disturb the
desktop layout and **does not create hidden/duplicate forms**. System language detection
has been implemented and independently reviewed.

---

## 1. Executive summary

QRtisan is a tool that lets users design QR codes personalized with frames, logos, colors,
and module shapes and download them as PNG or SVG, **running entirely in the browser**.
There are no accounts, servers, dynamic codes, or tracking; the logo and content never
leave the device.

The product's differentiating value comes down to three points:

1. **Privacy first:** QR generation, image processing, and export all happen client-side;
   there are no external network requests.
2. **Real design freedom:** 7 frames, 7 module shapes, a 3×3 corner combination, preset
   palettes, and logo support; preview, PNG, and SVG are all produced from **the same
   scene model**.
3. **Turkish and English done naturally:** The UI uses natural copy in both languages;
   the SVG label is embedded with bundled font subsets that preserve Turkish glyphs
   (İ, ş, ğ).

As of 2026-10-04, the core product is functional; system language detection has been
implemented and independently reviewed. The desktop sticky layout fix and the approved
mobile "Live mini QR" implementation have landed in the repository; integration and final
QA are in progress, and nothing counts as shipped until main-session verification is done.

---

## 2. Problem

Users' pain points when generating QR codes fall into three groups:

| Problem | Typical experience | QRtisan's answer |
| --- | --- | --- |
| Privacy and lock-in | Free QR sites upload the logo and content to a server, require an account, stamp a watermark, or funnel users to a time-limited plan | All processing is client-side; no account, no watermark, no external requests |
| Aesthetics and brand | Stock templates look alike; logo placement and color safety are left to the user | 7 frames, 7 module shapes, logo controls, preset palettes, and live scannability warnings |
| Turkish typography | Turkish glyphs in SVG/PNG labels fall back to the system font and the appearance breaks | Six Manrope subsets are embedded with `unicode-range`; label metrics are verified by tests |
| Immutability of printed codes | Users print a short-lived address assuming they can "update the QR later" | The immutability of static QR is explained explicitly **in this PRD** (Section 6.4). A UI copy that communicates this **does not exist yet**; it is a potential future UI requirement and does not count as implemented today |

---

## 3. Goals and non-goals

### 3.1 Goals

| # | Goal | Measurable indicator |
| --- | --- | --- |
| H1 | Enable users to generate and download their QR code in under 5 minutes | Task completion time in a moderated session |
| H2 | Send no data to any server | E2E network listener: zero external requests |
| H3 | Ensure the design produces output identical to the preview | PNG/SVG metric and matrix comparisons |
| H4 | Preserve Turkish glyphs intact in PNG and SVG | fontkit + `getBBox()` measurement tests |
| H5 | Warn in advance about designs that will not scan | Unit tests for warning rules |
| H6 | Make editing, preview, and download smooth on mobile too | Approved mobile acceptance matrix (Section 13.3) |

### 3.2 Non-goals (out of scope)

- Accounts, sign-in, subscriptions, or payments.
- Servers, cloud storage, email/link delivery.
- Dynamic QR (short link + server-side redirect) and the backend that goes with it.
- QR reading/scanning, tracking, analytics, or user behavior measurement.
- Persistent storage of user content (the design resets when the page is refreshed).
- SVG logo upload (deliberately rejected due to script execution risk).
- Third-party fonts/CDNs, cookies, fingerprinting.
- Mobile app store releases; the product is web-based.
- Broader multilingual expansion (languages other than TR/EN) is out of scope for this version.

---

## 4. Users, personas, and scenarios

### 4.1 Personas

| Persona | Context | Key need |
| --- | --- | --- |
| **Deniz — café owner** | Will print menu QR codes for tables; no design background | Fast, stylish code in brand colors; confidence it scans before printing |
| **Ece — event organizer** | Code on invitations/cards; limited budget and time | Frame/label options; high-resolution PNG |
| **Mert — freelance designer** | Produces codes matching corporate identity for clients | SVG vector output, font fidelity, logo control |
| **Selin — office/IT manager** | Shares guest Wi-Fi details with a single code | Wi-Fi mode, hidden network, correct escaping, fast generation |
| **Kaan — privacy-conscious user** | Does not want to send their logo and link to a third party | No network requests, no mandatory account |

### 4.2 Scenarios

| Scenario | Flow | Success criterion |
| --- | --- | --- |
| S1 — Menu QR | URL mode → address → frame/color → download PNG 2048 | Output reads with both decoders; the user approves the design |
| S2 — Business card QR | URL mode → upload logo → adjust size/padding → download SVG | SVG label matches preview metrics with the embedded font |
| S3 — Invitation QR | URL → top/bottom label → apply preset → PNG 1024 | Typical measured labels fit the box; the overflow limit for very wide-glyph/overlong labels is known (Section 15.1); the code scans |
| S4 — Guest Wi-Fi | Wi-Fi mode → SSID/password → hidden network → PNG | `WIFI:` payload is escaped correctly; the phone connects to the network |
| S5 — Contact | Email mode → recipient/subject → PNG | `mailto:` payload correctly encodes subject/message |
| S6 — Mobile quick share | Open on phone → enter content → verify the mini QR → download from the sheet | The approved mobile flow (Sections 6.3 and 7.12) works without interruption |

### 4.3 Primary jobs (jobs-to-be-done)

1. **"Turn my content into a QR."** Enter a URL, text, email, or Wi-Fi details; see a valid payload.
2. **"Make my code look like my brand."** Choose frame, label, logo, color, and shape.
3. **"Make sure it will work when scanned."** Read the warnings; fix density, contrast, and quiet zone.
4. **"Download a print-ready file."** Get PNG (512/1024/2048) or SVG.
5. **"Know that my data never leaves the device."** See that there are no network requests; understand that a refresh resets everything.

---

## 5. Scope and priorities

| Priority | Scope | Status |
| --- | --- | --- |
| **P0** | Content modes and validation, real QR matrix, byte capacity and ECC, 7 frames, logo, color/shape, live preview, scannability warnings, PNG/SVG, privacy, theme, TR/EN UI, basic accessibility, desktop sticky layout | ✅ Implemented (desktop fix 🔄) |
| **P1** | System language detection (implemented), desktop sticky layout fix (integrated, final QA in progress), approved mobile "Live mini QR" design (implementation in repository; automated coverage written; final QA in progress), performance measurement, real-device verification, accessibility audit (touch targets + dialog pattern) | ✅ language detection / 🔄 desktop / 🟡 mobile |
| **P2** | Additional languages, PWA/offline, batch generation, print presets (mm/DPI), new content modes (vCard, location, SMS), more frames/shapes, security hardening (CSP) | ⏸️ Deferred |

**Dynamic QR, accounts, and analytics are permanently out of scope.** No
"automatic dynamic QR backend" requirement is added even to the P2 list; such a direction
can only be considered through an explicit product decision and a separate architecture
effort.

---

## 6. Information architecture and user flows

### 6.1 Desktop (≥1024 px)

```
┌────────────────────────────────────────────────────────────────────┐
│ TopBar (sticky, z-30): brand · local badge · TR/EN · theme · reset │
├────────────────────────────────────────────────────────────────────┤
│ Hero: "Küçük kareler. Büyük fikirler." ("Small squares. Big ideas.") + description │
├──────────────────────────────────┬─────────────────────────────────┤
│ LEFT: editing                    │ RIGHT: sticky rail              │
│  01 Content (URL/Text/Email/Wi-Fi) │  Preview (live matrix)        │
│  Design tabs: Frame │ Logo │ Color & Shape │  Scannability warnings │
│  04 Presets (8)                  │  Export (PNG/SVG)               │
├──────────────────────────────────┴─────────────────────────────────┤
│ Footer: privacy and technical notes                                │
└────────────────────────────────────────────────────────────────────┘
```

- The grid opens into two columns at `lg` (64 rem / 1024 px) and above; the left column is
  content + design, and the right column is the preview + export rail (`src/App.tsx`).
- The right rail is sticky; its height is **measured** from the top bar's actual bottom edge
  and the container block's bottom edge (`src/hooks/useStickyRailHeight.ts`, `src/lib/layout.ts`).
  The preview card flexes, the export card is pinned at the bottom; only warning details
  scroll in their own pane. This keeps the QR inside the viewport, prevents it from
  colliding with the top bar/footer at the end of the page, and avoids a fixed bottom
  reservation. The integrated automated run is green and independent review accepted it
  (`e2e/sticky-preview.spec.ts`); real-screen/manual verification is pending (FR-UI-02).

### 6.2 Mobile — legacy linear flow (historical note)

Before the approved "Live mini QR" layout was implemented, mobile (<1024 px) used the
natural flow: `TopBar → Hero → Content → Preview → Export → Design → Presets → Footer`.
That flow **is no longer valid**; it has been superseded by the mobile layout in
Section 6.3. It is kept here only as comparison/decision context; it does not reflect
current product behavior.

### 6.3 Mobile — approved "Live mini QR" design (landed in repository; integration and final QA in progress)

**Product decision (2026-10-04):** The "Live mini QR" mobile design was approved. The
implementation has landed in the repository (`src/components/MobileStudio.tsx`,
`src/hooks/useMobileStudioLayout.ts`, `src/styles/mobile-studio.css`; mobile presentation
in the App `<1024` branch). Integration and final QA are in progress; **this work does not
count as shipped until the integrated tests actually run and the main session verifies it.**

```
┌──────────────────────────────────────┐
│ TopBar (sticky)                      │
├──────────────────────────────────────┤
│ Live mini QR (sticky, compact)       │  ← real matrix; tap → full screen
├──────────────────────────────────────┤
│ Content  │  Design   (step selection) │  ← full-width editor, no right column
│                                      │
│   (content of the active step)       │
│                                      │
├──────────────────────────────────────┤
│ [ Preview and download ]  (bottom action) │  ← safe area, sticky
└──────────────────────────────────────┘
        ↓ on tap
┌──────────────────────────────────────┐
│  Full-screen sheet: large QR         │
│  PNG size · Download PNG · Download SVG │
│  Warning summary (on demand)         │
│  Close (X / Esc)                     │
└──────────────────────────────────────┘
```

Design principles:

- **Live mini QR:** A compact QR proof below the top bar that stays visible while
  scrolling. It is drawn from the real matrix with the same scene engine as the preview;
  it is not a decorative image. The touch target cannot be smaller than 44×44 px
  (target 48×48).
- **Full-width editor and step navigation:** Toggle between the Content and Design steps;
  the desktop right column does not exist on mobile. Step state is preserved.
- **Bottom safe-area action:** A sticky bar that leaves `safe-area-inset-bottom` of space;
  the primary action is "Preview & download" (TR: "Önizle ve indir"). Equivalent space
  is added at the bottom of the page so the bar does not cover content.
  **Deliberate design exception:** the bar hides while a text input is focused or the
  visual keyboard is open (to avoid keyboard/focus collision); it returns when focus is
  lost or the keyboard closes. Therefore "always visible" is not an absolute guarantee but
  a design preference. Focus and `visualViewport` shrinkage are **simulated** automatically
  (not a physical keyboard); physical keyboard behavior on a real device awaits manual
  verification.
- **Full-screen accessible sheet:** The large QR fits the viewport width; the PNG size and
  PNG/SVG download actions live here. A native `<dialog>` modal is used (implicit
  `role="dialog"` / `aria-modal`), with an `aria-labelledby` heading; the background is
  `inert`; focus is trapped. The sheet closes via the **X** button in its header or **Esc**;
  it does not close on outside click. Because body flow remains scrollable, download
  controls are reachable within the page; while the modal is open the editor is
  non-interactive (inert). On close, focus returns to the trigger element and the sticky
  mini QR becomes visible again.
- **Warnings on demand:** Scannability warnings do not push the mini QR down; they are
  reachable inside the sheet or in a collapsible section via a summary/badge.
- **Single source of state:** Content, design, and logo are preserved across step changes,
  sheet open/close, language/theme changes, and resizing to desktop. Desktop and mobile
  views share the same form; **no hidden/duplicate forms are created.** The desktop
  presentation gives way to the mobile presentation at the <1024 px breakpoint.
- **Same engine guarantee:** Mini QR, sheet QR, PNG, and SVG are produced from the same
  scene; the output has exactly the same geometry as the preview.
- **Reduced motion:** Transitions and sheet animations are simplified with `prefers-reduced-motion`.

### 6.4 What a static QR is and is not

**Static QR code:** The data the QR code carries (payload) is embedded into the matrix at
generation time. When a phone camera reads the code, the embedded URL opens directly. The
code's content **cannot be changed after printing**; redirecting it to a different address
requires generating a new QR code and reprinting. The URL should therefore be as permanent
as possible.

**Changing content in QRtisan:** Editing the address in the app produces **a new matrix**.
A previously downloaded or printed file is not updated; the old code keeps pointing to the
old address. The user must download the new design again.

**Dynamic QR code:** Carries a short redirect link; the target URL can be changed on the
server side. That approach requires a backend/service, accounts, and tracking, and is out
of scope for QRtisan. **There is no automatic dynamic QR backend requirement.**
QRtisan produces static QR codes only; it connects to no server and tracks no code.

### 6.5 End-to-end flows

| Flow | Steps | Edge cases |
| --- | --- | --- |
| URL → output | Select mode → enter address → validation → matrix → design → preview → download | https is added when the scheme is missing; whitespace/invalid domain names are rejected; capacity overflow is warned about |
| Wi-Fi → output | Select mode → SSID/password/visibility → `WIFI:` payload → preview → download | Password field is disabled in no-password mode; special characters are escaped |
| Logo → output | Upload logo → validate → size/padding → ECC H lock → download | A rejected upload does not corrupt the current design; an unresolvable logo can be removed |
| Theme/language | Change preference → UI updates | QR payload, colors, logo, and output remain bit-for-bit identical |
| Mobile quick | Enter content → mini QR → sheet → download | While the sheet is open the background is non-interactive; state is preserved |

---

## 7. Functional requirements

Each requirement includes an ID, a requirement statement, a status, a testable acceptance
criterion, and evidence. The "Evidence" column indicates which test/manual check verifies
the criterion.

### 7.1 Content and validation (FR-CON)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-CON-01 | URL mode: `https://` is added when the scheme is missing; only http/https is accepted | ✅ | `example.com` → `https://example.com`; inputs containing spaces, invalid domain names, or schemes other than http/https produce an error; IPv4 octets 0–255; a local network name is accepted only with a scheme/port | `src/lib/content.test.ts`, `e2e/studio.spec.ts` |
| FR-CON-02 | Text mode: cannot be empty; at most 1200 UTF-16 code units | ✅ | Error above the limit; counter visible in the UI; payload is the text itself | `src/lib/content.test.ts` |
| FR-CON-03 | Email mode: a valid address is required; subject/message are percent-encoded inside `mailto:` | ✅ | Empty fields are not added to the parameter; `encodeURIComponent` is used | `src/lib/content.test.ts`, `e2e/studio.spec.ts` |
| FR-CON-04 | Wi-Fi mode: SSID required; password required for WPA/WEP; `WIFI:T:…;S:…;P:…;;` | ✅ | `\ ; , : "` are escaped; `nopass` skips the password; hidden network adds `H:true` | `src/lib/content.test.ts`, `e2e/studio.spec.ts` |
| FR-CON-05 | Payload preview and copy | ✅ | The payload is truncated to 96 code-point-safe characters (emoji are not split); copy writes to the clipboard | `src/lib/content.test.ts` |
| FR-CON-06 | No payload is generated for invalid content, the primary error is shown, and export is locked | ✅ | PNG/SVG buttons are disabled for an invalid URL; "Önizleme bekleniyor" ("Waiting for preview") is shown | `e2e/studio.spec.ts`, `e2e/i18n.spec.ts` |
| FR-CON-07 | On first load the URL field is empty; the sample address is only a placeholder | ✅ | The sample address is not pre-filled (`example.com` is only a placeholder); on the first untouched load, a friendly, localized waiting state is shown instead of a scary validation error; no QR is generated and export stays disabled until a valid address is entered; clearing returns to a safe empty state | `src/lib/content.test.ts`, `e2e/studio.spec.ts`, `e2e/i18n.spec.ts`, `e2e/mobile-studio.spec.ts` |

### 7.2 QR generation, capacity, and error correction (FR-QR)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-QR-01 | The matrix is generated for real with the `qrcode` encoder; there is no imitation/decorative matrix | ✅ | Finder patterns are correct; matrix size grows with content | `src/lib/qr.test.ts`, `src/lib/decode.test.ts` |
| FR-QR-02 | Capacity is measured in **bytes**; multi-byte content (Turkish, emoji, CJK) fills it faster | ✅ | UTF-8 byte length is computed; content such as 637 × "ü" is automatically downgraded | `src/lib/content.test.ts`, `src/lib/decode.test.ts` |
| FR-QR-03 | Automatic ECC: ≤220 bytes M, ≤500 Q, >500 H; if it does not fit, it falls back to the highest level that fits and an informational warning is shown | ✅ | The downgrade is reported with the `auto-downgraded` warning; it is not silently swallowed | `src/lib/qr.test.ts`, `src/lib/warnings.test.ts` |
| FR-QR-04 | Content that does not fit at a locked level (logo or manual selection) does not stay silent | ✅ | Call to action in the form and preview; export locked; with a logo, a "remove the logo" suggestion | `src/lib/qr.test.ts`, `e2e/studio.spec.ts` |
| FR-QR-05 | Quiet zone defaults to 4 modules; the user can set 0–6 | ✅ | Warning below 4 modules; the output includes the quiet zone | `src/lib/warnings.test.ts`, `src/lib/geometry.test.ts` |
| FR-QR-06 | The preview shows matrix size, version, and active ECC | ✅ | "N×N modül · sürüm X · hata düzeltme Y" ("N×N modules · version X · error correction Y") text | `e2e/studio.spec.ts` |

### 7.3 Frames and labels (FR-FRM)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-FRM-01 | 7 frames: None, Thin border, Bottom label, Top label, Bubble, Corner marks, Badge (TR: Yok, İnce çerçeve, Alt etiket, Üst etiket, Kabarcık, Köşe izi, Rozet) | ✅ | Each frame's geometry is proportional to QR size; preview and output match | `src/lib/geometry.test.ts`, `src/lib/decode.test.ts` |
| FR-FRM-02 | Label text is editable, at most 48 characters; language-aware suggestions and clearing | ✅ | The suggestion button fills the label; an empty label draws only the QR | `e2e/studio.spec.ts`, `e2e/i18n.spec.ts` |
| FR-FRM-03 | Long labels are automatically shrunk to fit the box | ✅ (measured typical labels) | Shrinks to **45% of the base size** (at most 55% reduction; `fitCaption` floor is 0.45). With very wide glyphs or overlong labels the floor may allow overflow; **there is no universal "never overflows" guarantee.** Typical measured labels fit; exact universal fitting is a future acceptance/manual test topic | `src/lib/geometry.test.ts` |
| FR-FRM-04 | Frame/label does not break scannability | ✅ | Every frame is read by at least one independent decoder | `src/lib/decode.test.ts` |
| FR-FRM-05 | Frame roundness 0–100 applies only to the relevant frames | ✅ | Roundness control is not shown for None/badge/Corner marks | `src/components/FramePanel.tsx`, `e2e/studio.spec.ts` |

### 7.4 Logo (FR-LGO)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-LGO-01 | Only PNG/JPEG/WebP are accepted; SVG and others are rejected | ✅ | Localized error; the current design is not overridden | `src/lib/logo.test.ts`, `e2e/studio.spec.ts` |
| FR-LGO-02 | Limits: at most 2 MB, 24–4000 px; empty and unresolvable files are rejected | ✅ | Error message includes the measurement; number formatting is consistent across languages | `src/lib/logo.test.ts`, `e2e/i18n.spec.ts` |
| FR-LGO-03 | Drag-and-drop, file picker, replace; input disabled while reading | ✅ | "Dosya okunuyor…" ("Reading file…") is shown while reading; input is locked | `e2e/studio.spec.ts` |
| FR-LGO-04 | Size 14–32%, padding 1.5–8%, "Altındaki modülleri temizle" ("Clear modules behind logo"); aspect ratio preserved, centered | ✅ | "Logo büyük" ("Logo is large") warning above 26%; non-square logo is not distorted | `src/lib/logo.test.ts`, `src/lib/warnings.test.ts`, `src/lib/scene.test.ts` |
| FR-LGO-05 | With a logo, ECC is locked to H; selection is disabled | ✅ | ECC selection is disabled; the H-lock warning is shown | `e2e/studio.spec.ts`, `src/lib/warnings.test.ts` |
| FR-LGO-06 | Upload races are safe: a rejected attempt does not corrupt the current logo; reset invalidates an in-flight read; an unresolvable logo is removed with X | ✅ | Epoch-based cancellation; a late result does not restore the design; X removes the broken logo and unlocks export | `src/hooks/logoReadiness.test.ts`, `e2e/i18n.spec.ts` |

### 7.5 Color and shape (FR-CLR)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-CLR-01 | Color picker + hex input for foreground/background | ✅ | `#abc`/`#aabbcc` accepted; invalid input reverts on blur | `src/lib/colors.test.ts`, `e2e/studio.spec.ts` |
| FR-CLR-02 | 11 preset colors, 6 preset palette pairs, invert colors, transparent background | ✅ | Values are identical across languages; only names are localized; background control is disabled on a transparent background | `src/lib/colors.test.ts`, `e2e/i18n.spec.ts` |
| FR-CLR-03 | Live WCAG contrast indicator and warnings | ✅ | ≥7 excellent, ≥4.5 good, ≥3 borderline, <3 insufficient; <3 danger, 3–4.5 warning | `src/lib/colors.test.ts`, `src/lib/warnings.test.ts` |
| FR-CLR-04 | 7 module shapes (square, soft, extra round, dots, classy, classy soft, diamond; TR: kare, yumuşak, çok yuvarlak, nokta, classy, classy yumuşak, elmas) + 3×3 corner combination | ✅ | Shapes are previewed with real SVG geometry; square modules are recommended for dense content | `src/lib/shapes.test.ts`, `src/lib/decode.test.ts`, `e2e/studio.spec.ts` |

### 7.6 Presets (FR-PRS)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-PRS-01 | 8 presets; each card is drawn as a real mini QR | ✅ | Cards are `role="img"` with localized labels; the selected card is marked | `src/lib/presets.test.ts`, `e2e/studio.spec.ts` |
| FR-PRS-02 | Keeps the app's content and logo; changes the design | ✅ | Logo remains; content payload stays the same; the active preset ID is marked | `e2e/studio.spec.ts`, `e2e/i18n.spec.ts` |
| FR-PRS-03 | Name/description/sample label are applied in the selected language; the user's label is not auto-translated afterwards | ✅ | "Scan & explore" in EN, "Okut & keşfet" in TR; when the language changes the existing label is preserved | `src/lib/presets.test.ts`, `e2e/i18n.spec.ts` |

### 7.7 Preview and scannability warnings (FR-PRV)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-PRV-01 | Live preview is drawn from the real matrix, including frame, label, and logo | ✅ | Canvas updates when content/design changes; a status badge is visible while the logo is loading | `e2e/studio.spec.ts`, `src/lib/scene.test.ts` |
| FR-PRV-02 | Warning rules use stable IDs: `auto-downgraded`, `contrast-low`, `contrast-borderline`, `inverted`, `transparent-bg`, `logo-ec`, `logo-large`, `density-high`, `density-medium`, `quiet-zone`, `dot-style-dense`, `payload-long`, `caption-long` | ✅ | ID/severity are constant across languages; title/detail are localized | `src/lib/warnings.test.ts` |
| FR-PRV-03 | When there is no valid matrix, the warning list says "check not performed"; no success message is shown | ✅ | On capacity overflow, "QR kod oluşturulamadı" ("QR code could not be created") and guidance text | `e2e/studio.spec.ts` |
| FR-PRV-04 | Measurement/warning summary is announced to screen readers via `aria-live` | ✅ | The hidden live region reads the warning count and titles | `src/components/PreviewPanel.tsx` (sr-only `role="status" aria-live="polite"`); there is no separate E2E assertion for this behavior |
| FR-PRV-05 | Warnings guide users without alarming them; each warning suggests a concrete fix | ✅ | Contrast, logo size, quiet zone, and density copy suggest actions | `src/lib/warnings.test.ts` |

### 7.8 Export (FR-EXP)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-EXP-01 | PNG 512/1024/2048 px wide; height varies with the frame | ✅ | When 512 is selected the file is 512 px wide; with a framed design the height is >512 | `e2e/studio.spec.ts` |
| FR-EXP-02 | SVG scalable vector; 1000-unit viewBox; includes frame/label/logo | ✅ | Contains `<image href="data:…">`, `fill-rule="evenodd"`, `<text>`; readable when rasterized | `src/lib/render/svg.ts`, `e2e/studio.spec.ts` |
| FR-EXP-03 | Six Manrope subsets are embedded into the SVG with `unicode-range` | ✅ | 6 `@font-face`; latin-ext covers Turkish glyphs; the SVG label approaches preview metrics within 2% | `src/lib/fonts.test.ts`, `e2e/studio.spec.ts` |
| FR-EXP-04 | Preview, PNG, and SVG are produced from the same scene | ✅ | Proportions are preserved across different sizes; PNG bytes stay identical across theme/language changes | `src/lib/scene.test.ts`, `e2e/theme.spec.ts` |
| FR-EXP-05 | File name `qrtisan-qr-YYYYMMDD-HHMM.(png\|svg)` | ✅ | Date stamp is generated in local time; the QR payload is not written into the file name | `src/lib/render/export.ts`, `src/lib/render/export.test.ts` |
| FR-EXP-06 | Export statuses are localized; raw internal error text does not leak; stale text does not remain after a language change | ✅ | "PNG hazırlanıyor…" ("Preparing PNG…"), "PNG indirildi…" ("PNG downloaded…"), error mappings; on language change, either the current language or a clean state | `src/lib/render/exportErrors.test.ts`, `e2e/export-localization.spec.ts` |
| FR-EXP-07 | Export is locked for invalid content, capacity overflow, or while the logo is loading/failed | ✅ | Buttons are disabled; a tooltip explains why; unlocked once the logo is ready | `e2e/studio.spec.ts` |
| FR-EXP-08 | State races are safe during concurrent/slow exports | ✅ | When the input changes, an old result does not write back its state | `src/components/ExportPanel.tsx`, `e2e/export-localization.spec.ts` |

### 7.9 Language and system language detection (FR-LOC)

This group defines the requirement the user submitted on 2026-10-04. Detection has been
**implemented and independently reviewed**: `src/i18n/localePreference.ts` resolves the
system language, `src/i18n/I18nProvider.tsx` manages the explicit preference and live
system-language changes, and `index.html` sets the `lang` value before first paint.

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-LOC-01 | On the first visit, if there is no stored `kare-locale`, `navigator.languages` is scanned in order; the first supported language (tr/en) is used; if none is supported it falls back to **English** | ✅ | Examples: `['tr-TR','en-US']`→tr; `['en-GB','tr-TR']`→en; `['de-DE','fr-FR']`→en; `['de-DE','tr-TR','en-US']`→tr | `src/i18n/localePreference.test.ts`, `e2e/system-locale.spec.ts` |
| FR-LOC-02 | An explicit user choice always wins and is stored as `kare-locale` | ✅ (existing) | A stored value overrides detection; the choice survives refresh | `e2e/i18n.spec.ts` |
| FR-LOC-03 | An automatically detected language is not stored as a "manual preference" | ✅ | The detection result is not written to `kare-locale`; if no explicit choice was made, the next visit detects again | `src/i18n/localePreference.test.ts`, `e2e/system-locale.spec.ts` |
| FR-LOC-04 | Language change does not alter payload, design, color, logo, or theme | ✅ | `payload-preview` and PNG output stay identical across language changes; errors are re-translated from stable codes | `e2e/i18n.spec.ts`, `src/lib/logo.test.ts` |
| FR-LOC-05 | All user-visible text is in the active language; the other language does not leak | ✅ | Tabs, validation, warnings, export statuses, `aria-label`s | `e2e/i18n.spec.ts`, `e2e/export-localization.spec.ts` |
| FR-LOC-06 | `document.lang` and `document.title` update to the active language | ✅ | `html[lang]` tr/en; title meaningful in both languages | `e2e/i18n.spec.ts` |
| FR-LOC-07 | Language detection/storage is client-side only; no server-side data processing under GDPR, no cookies/fingerprinting | ✅ | No network requests; only the functional `kare-locale` key | `e2e/studio.spec.ts` (network), `e2e/theme.spec.ts` (storage keys) |

### 7.10 Theme (FR-THM)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-THM-01 | Light / dark / system; default system | ✅ | `system` when there is no preference on first load; the control shows the preference, not the resolved theme | `src/theme/theme.test.ts`, `e2e/theme.spec.ts` |
| FR-THM-02 | `system` tracks the OS scheme live; an explicit choice is unaffected by OS changes | ✅ | `data-theme` updates when the OS toggles dark↔light; an explicit preference stays fixed | `e2e/theme.spec.ts` |
| FR-THM-03 | Only `kare-theme` is stored; it is applied by an inline script before first paint | ✅ | No color flash; `color-scheme` and `theme-color` are correct; does not crash if storage is blocked | `e2e/theme.spec.ts`, `src/theme/theme.test.ts` |
| FR-THM-04 | Theme change does not alter the QR canvas, colors, or export | ✅ | PNG bit-for-bit identical; swatches and payload stay the same | `e2e/theme.spec.ts` |
| FR-THM-05 | Critical surfaces are legible in dark theme | ✅ | Body/heading/input contrast >7:1; accent and status badge >4.5:1 | `e2e/theme.spec.ts` |

### 7.11 Layout (FR-UI)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-UI-01 | Desktop (≥1024 px): editing on the left, sticky preview + export on the right | ✅ | QR stays visible while the page scrolls; visible on every design tab | `e2e/sticky-preview.spec.ts` |
| FR-UI-02 | **Desktop fix:** QR is bounded to the viewport; downloads are pinned; only warnings/details scroll; no meaningless empty band at the bottom; top bar/footer are protected on short screens; editing and QR stay visible after download | ✅ Automated QA passed (2026-10-04); independent review accepted; manual hardware pending | At 1280×600 the PNG button is visible and usable without scrolling; at 1366×768 the QR is fully visible; the rail does not collide with the footer; page position is not disturbed after download | `e2e/sticky-preview.spec.ts` (current spec asserts sticky rail, in-viewport canvas, no horizontal overflow, and PNG download; footer collision and post-download page position are not asserted by the current spec), `src/lib/layout.test.ts` |
| FR-UI-03 | Mobile (<1024 px) separate mobile studio branch; the desktop rail/two columns are not rendered; no horizontal overflow | 🟡 Implementation landed; automated run green and independent review accepted; dedicated absence-assertion E2E coverage pending | `mobile-studio` visible, `preview-rail` and `studio-grid` absent; no overflow at 320/390 px; the legacy linear flow is no longer valid | `src/App.tsx` (<1024 branch implements the split); `e2e/mobile-studio.spec.ts` (mobile studio visible + state preservation; no direct `preview-rail`/`studio-grid` absence assertion). Dedicated absence-assertion E2E coverage pending |
| FR-UI-04 | Mobile: approved "Live mini QR" design | 🟡 Implementation landed; final QA in progress | Section 7.12 and the Section 13.3 acceptance matrix | `e2e/mobile-studio.spec.ts` (existing; awaiting final integrated green) |
| FR-UI-05 | No horizontal overflow at 320/390/768/1024/1366×768/1280×600 viewports | 🔄 | 320 and 390 covered in the mobile spec; 1366×768 and 1280×600 covered in the sticky spec; 768 and 1024 coverage is planned/manual | `e2e/mobile-studio.spec.ts`, `e2e/sticky-preview.spec.ts` |
| FR-UI-06 | Top bar does not overflow at 320/390 px; controls remain accessible | ✅ | Language selector and theme control within the viewport; title wraps | `e2e/i18n.spec.ts`, `e2e/theme.spec.ts` |

### 7.12 Approved mobile design (FR-MOB)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-MOB-01 | Sticky, compact, **live** mini QR below the top bar | 🟡 Implementation landed; final QA in progress | Drawn from the real matrix; visible while scrolling; does not collide with the topbar; tapping opens the sheet | `e2e/mobile-studio.spec.ts` (existing; awaiting final integrated green) |
| FR-MOB-02 | Full-width editor; Content/Design step navigation; no right column | 🟡 Implementation landed; final QA in progress | Toggle between steps; active step state is preserved; the two columns are not visible below 1024 | `e2e/mobile-studio.spec.ts` (existing; awaiting final green) |
| FR-MOB-03 | Bottom safe-area "Preview & download" action (TR: "Önizle ve indir") | 🟡 Implementation landed; final QA in progress | `safe-area-inset-bottom`; sticky; does not cover content. Hidden while a text input is focused/the visual keyboard is open, returns on focus loss/keyboard close (deliberate exception; not an absolute "always reachable") | `e2e/mobile-studio.spec.ts` (existing; awaiting final green) |
| FR-MOB-04 | Full-screen sheet: large QR + PNG size + PNG/SVG download | 🟡 Implementation landed; final QA in progress | QR fits the width; downloads work; status text is visible | `e2e/mobile-studio.spec.ts` (existing; awaiting final green) |
| FR-MOB-05 | State preservation: content, design, and logo are preserved across step/sheet/language/theme/resize | 🟡 Implementation landed; final QA in progress | Payload or design is not reset by any transition; no hidden/duplicate forms | `e2e/mobile-studio.spec.ts` (existing; awaiting final green) |
| FR-MOB-06 | Warnings on demand; they do not push the mini QR down | 🟡 Implementation landed; final QA in progress | Summary/badge is reachable; details open optionally | `e2e/mobile-studio.spec.ts` (existing; awaiting final green) |
| FR-MOB-07 | Same scene engine: mini QR, sheet QR, PNG, and SVG have exactly the same geometry | 🟡 Implementation landed; final QA in progress | PNG is decodable; metrics match the preview | `e2e/mobile-studio.spec.ts`, `e2e/studio.spec.ts` (existing; awaiting final green) |
| FR-MOB-08 | Accessible dialog: native `<dialog>` modal (implicit `role="dialog"`/`aria-modal`), focus trap, `inert` background, X/Esc close (not outside click), focus restore | 🟡 Implementation landed; final QA in progress | Sheet fully usable by keyboard; focus cannot escape; returns to the trigger on close | `e2e/mobile-studio.spec.ts` (existing; awaiting final green) |
| FR-MOB-09 | Touch targets: at least 44×44 px (target 48×48) and safe areas | 🟡 Automated green and independent review accepted; physical device/manual checks pending | The 44 px target is measured automatically **separately at both 320×568 and 390×844** (including TR/EN reset); overflow/clipping automated; `safe-area` tokens simulated with CSS variables; `visualViewport` keyboard shrinkage simulated (physical device/manual checks pending) | `e2e/mobile-studio.spec.ts` (44 px at 320×568 and 390×844 + overflow + simulated safe area + simulated keyboard; physical device pending) |
| FR-MOB-10 | Mobile presentation at the `<1024` breakpoint; desktop code is not duplicated | 🟡 Implementation landed; final QA in progress | Single source of state; same form components; lossless resize | `e2e/mobile-studio.spec.ts` (mobile→desktop state test exists; awaiting final green) + code review |
| FR-MOB-11 | Language/theme on mobile does not change payload or design either | 🟡 Implementation landed; final QA in progress | Payload/matrix constant across TR/EN and light/dark transitions | `e2e/mobile-studio.spec.ts`, `e2e/i18n.spec.ts`, `e2e/theme.spec.ts` (existing; awaiting final green) |
| FR-MOB-12 | Mobile E2E suite | 🟡 Automated green and independent review accepted; physical device/manual checks pending | Mobile coverage counts as complete once `e2e/mobile-studio.spec.ts` is green in the integrated automated run | Run report (main session verification) |

### 7.13 Accessibility (FR-A11Y)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-A11Y-01 | All interactions are keyboard accessible; visible focus ring; a "skip to content" link (TR: "içeriğe geç") | ✅ | Tabs navigate with arrow keys/Home/End; the focus ring is not suppressed | `e2e/studio.spec.ts` |
| FR-A11Y-02 | ARIA tabs pattern: `role="tab"`, `aria-selected`, roving tabindex, `aria-controls` targets in the DOM | ✅ | Each panel ID is unique and accessible; hidden panel is `hidden` | `e2e/studio.spec.ts` |
| FR-A11Y-03 | Status and error announcements via `role="status"` / `role="alert"` | ✅ | Export status and warning summary are announced to screen readers | `src/components/ExportPanel.tsx`, `src/components/PreviewPanel.tsx` (sr-only live region) |
| FR-A11Y-04 | `prefers-reduced-motion` supported | 🟡 Automated coverage written; awaiting final integrated green | Animations and transitions are simplified; smooth scrolling is disabled | `src/index.css`, `src/styles/mobile-studio.css`; `e2e/mobile-studio.spec.ts` (emulated reduced-motion automated test exists) |
| FR-A11Y-05 | Touch targets at least 44×44 px (target 48×48) | 🟡 Partial coverage | 44 px measurement automated at **both 320×568 and 390×844** (including TR/EN reset); the 48 px target and physical safe areas have not been verified on a real device | `e2e/mobile-studio.spec.ts` (44 px measurement at 320×568 and 390×844; physical device pending) |
| FR-A11Y-06 | Mobile sheet accessible dialog pattern (focus trap, inert background, Esc, focus restore) | 🟡 Implementation landed; final QA in progress | See FR-MOB-08 | `e2e/mobile-studio.spec.ts` (existing; awaiting final green) |
| FR-A11Y-07 | Bottom action bar and sheet respect safe areas (`env(safe-area-inset-*)`) | 🟡 Automated simulation test written; physical device verification in progress | On a notched device the action bar does not collide with the system indicator | `src/styles/mobile-studio.css`; `e2e/mobile-studio.spec.ts` (safe area simulated with CSS variables; physical notch manual) |
| FR-A11Y-08 | Form fields are labeled; errors are associated via `aria-describedby`; `invalid` state | ✅ | Field errors are correctly bound to screen readers | `src/components/ContentPanel.tsx` (`aria-describedby` bound per field: URL, Text, Email recipient, Wi-Fi SSID, and Wi-Fi password rows); `src/components/ui.tsx` only applies `aria-invalid`; `aria-describedby` is not there. There is **no separate E2E assertion yet** for this binding; if needed, E2E coverage should be added separately |
| FR-A11Y-09 | UI text meets the WCAG AA target in light and dark themes | ✅ | Body/heading >7:1 in dark theme; accent >4.5:1 | `e2e/theme.spec.ts` |

### 7.14 Privacy and data lifecycle (FR-PRVY)

| ID | Requirement | Status | Acceptance criterion | Evidence |
| --- | --- | --- | --- | --- |
| FR-PRVY-01 | The app makes no external network requests | ✅ | Only same-origin app assets; the network listener is empty | `e2e/studio.spec.ts` |
| FR-PRVY-02 | Content, logo, and design are memory-only; they reset on page refresh | ✅ | No QR data in `localStorage`; content resets on refresh (fields empty, URL field opens empty) | `e2e/i18n.spec.ts`, `e2e/theme.spec.ts` |
| FR-PRVY-03 | Persistent data is preferences only: `kare-theme` and `kare-locale` | ✅ | All keys in storage are one of these two | `e2e/theme.spec.ts` |
| FR-PRVY-04 | Does not crash if storage is blocked (private mode, etc.); falls back to safe defaults | ✅ | Theme `system`, language safe default; the session continues to work | `src/theme/theme.test.ts`, `src/i18n/I18nProvider.tsx` |
| FR-PRVY-05 | System language detection is client-side; the result is not sent to a server and is not stored like a manual preference | ✅ | No network requests; `kare-locale` is written only on explicit choice | `src/i18n/localePreference.test.ts`, `e2e/system-locale.spec.ts`, `e2e/studio.spec.ts` |
| FR-PRVY-06 | SVG font subsets are read from the app's own bundle (local request) | ✅ | 6 woff2 files same-origin; no external requests | `e2e/studio.spec.ts` |
| FR-PRVY-07 | No cookies, analytics, third-party fonts/CDNs | ✅ | Repository and network traces are clean | `e2e/studio.spec.ts` |

---

## 8. Technical architecture

### 8.1 Technology stack

| Layer | Technology |
| --- | --- |
| UI | React 19, TypeScript 5.9, Tailwind CSS 4 (Vite plugin) |
| Build/serve | Vite 8, static output (`dist/`) |
| QR encoding | `qrcode` (MIT) — real matrix generation |
| Icons | `lucide-react` |
| Fonts | `@fontsource-variable/manrope`, `@fontsource/ibm-plex-mono` (bundled, no external requests) |
| Unit tests | Vitest 5; `@napi-rs/canvas`, `fontkit`, `jsqr`, `@zxing/library`, `sharp`, `pngjs` |
| End-to-end tests | Playwright (Chromium desktop) |
| Language/theme | React context + `localStorage` preferences |

### 8.2 Module structure

```
src/
  lib/            pure, React-independent logic
    content.ts    content models, validation, payload generation
    qr.ts         matrix generation, ECC resolution, capacity
    shapes.ts     module/corner SVG paths
    geometry.ts   frame/label layout (proportional to QR size)
    colors.ts     contrast, luminance, palettes
    warnings.ts   scannability rules
    locale.ts     TR/EN translation core
    fonts.ts      font constants and subsets
    logo.ts       raster logo validation/reading
    presets.ts    8 presets
    render/       scene → Canvas 2D and SVG, PNG export, error localization
  components/     accessible UI components
  hooks/          state (useStudio), logo readiness, visual/width observation
  theme/          theme preference and provider
  i18n/           language context and error translation
  styles/         sticky preview layout
  test/           PNG drawing, jsQR/ZXing decoders
e2e/              Playwright tests
```

### 8.3 Scene pipeline (preview = PNG = SVG)

```
payload → resolveMatrix (ECC) → QrMatrix ─┐
                                          ├→ buildScene(matrix, design, logo) → Scene
design (frame/color/shape/label) ─────────┘        │
                                                   ├→ renderSceneToCanvas → preview / PNG
                                                   └→ sceneToSvg + embedded font CSS → SVG
```

A single scene model structurally prevents geometry differences between the preview and
the export. Label measurement uses the same font stack and real glyph metrics in the
preview, PNG, and SVG.

---

## 9. Data lifecycle and preference boundary

| Data | Where it is kept | Lifetime | Sent to a server? |
| --- | --- | --- | --- |
| QR content (URL, text, email, Wi-Fi) | React state (memory) | Until the tab is closed/refreshed | No |
| Logo file | In-memory `data:` URL; `Image` element | Same | No |
| Design (frame, color, shape, label, ECC) | React state (memory) | Same | No |
| Generated matrix/scene | Memory | Derived; not persistent | No |
| Downloaded PNG/SVG | User's device | Belongs to the user | No |
| Theme preference | `localStorage['kare-theme']` (legacy key name; retained for backward compatibility) | Until the user changes it | No |
| Language preference (explicit choice) | `localStorage['kare-locale']` (legacy key name; retained for backward compatibility) | Until the user changes it | No |
| Automatically detected language | Memory (session) | Session | No (FR-LOC-03) |
| Analytics/telemetry | — | — | **None** |

**Preference boundary:** Persistent storage is limited to two functional keys. QR content,
logo, color, or design are never written to persistent storage under any circumstances. If
storage is blocked, the app keeps preferences in session memory only and runs with defaults.

---

## 10. Performance budgets (targets — not measured)

The values below are **targets that have not been measured yet**; they must not be
interpreted as measurement results in this PRD. Measurement methods are also defined in the
table. The single ✅ row in the table (first export before fonts load) is **not** a
performance measurement but a functional correctness test (`e2e/studio.spec.ts`); all
performance budgets remain unmeasured.

| Area | Target | Measurement method | Status |
| --- | --- | --- | --- |
| First contentful paint (LCP) | ≤ 2.5 s (mid-range laptop, cold cache, local preview server) | Chrome DevTools / `PerformanceObserver`; median of 5 runs | ⏸️ |
| Input responsiveness (INP) | ≤ 200 ms (p75) | Playwright + PerformanceObserver or Lighthouse | ⏸️ |
| Content → preview update | ≤ 100 ms (p50), ≤ 250 ms (p95), 1024 px canvas | Edit cycle with `performance.mark/measure` | ⏸️ |
| PNG 2048 export | ≤ 2 s (desktop), ≤ 4 s (mid-range mobile) | From button click to download event | ⏸️ |
| SVG export (including 6 font subsets) | ≤ 1.5 s (first), ≤ 300 ms (cached) | Same method | ⏸️ |
| Initial JS (gzip) | ≤ 250 KB (excluding font subsets) | `vite build` output + gzip measurement | ⏸️ |
| CSS (gzip) | ≤ 50 KB | Same | ⏸️ |
| Peak memory (2048 PNG) | ≤ 150 MB | Chrome Task Manager / `performance.memory` | ⏸️ |
| First export before fonts load | Correct metrics; PNG byte-for-byte identical | E2E: woff2 delay test | ✅ (`e2e/studio.spec.ts`) |

---

## 11. Security and abuse

| Topic | Implementation | Limit / note |
| --- | --- | --- |
| Data leakage | All processing is client-side; zero external requests verified with a network listener | Browser extensions and the operating system are out of scope |
| Logo upload | Raster MIME types only; SVG rejected; size and pixel limits | MIME spoofing is a separate hardening topic; content is still decoded via `Image`, no script is executed |
| Text escaping | SVG text is XML-escaped (`& < > " '`); Wi-Fi special characters are escaped; email parameters use `encodeURIComponent` | — |
| HTML injection | User text is not rendered with `innerHTML`; React automatic escaping is used | — |
| External resources | No CDN, third-party font, cookie, or analytics | CSP headers are not defined in this version (P2) |
| Capacity DoS | Content is capped at 1200 UTF-16 code units; matrix generation is local and synchronous | Very large inputs are rejected |
| Dependency risk | A small number of packages with common licenses | No regular `npm audit` process is defined (P2) |

> **There is no security approval.** This section only describes basic local measures; the
> product has not undergone an independent security audit, does not count as
> "security-certified", and the gate in Section 19 has not yet been run for public release.
> The security audit continues as a separate process; this PRD does not claim its outcome.

---

## 12. Product success metrics

By default there is **no analytics/tracking**; measurement is done through automated test
gates and manual usability sessions. The markers below indicate **comprehensive automated
evidence**; they do not mean a final integrated release green, independent review, or
product owner approval. The final assessment is made in the main session's integrated run
and at the release gate after ongoing work is finished.

| Metric | Target | Measurement method | Status |
| --- | --- | --- | --- |
| Export scannability | 100% on the automatic matrix (two decoders on plain designs, at least one decoder on decorative shapes) | `npm run test` + `npm run test:e2e` decoder tests | 🔄 Unit test sources exist; E2E coverage written; awaiting final integrated green |
| External network requests | 0 | Playwright network listener | 🟡 Comprehensive automated evidence available; awaiting final integrated review |
| Theme immutability | PNG bit-for-bit identical across theme changes | `e2e/theme.spec.ts` | 🟡 Coverage independently reviewed (real); awaiting final integrated release gate |
| Language immutability | Payload and design identical across language changes | `e2e/i18n.spec.ts`, `e2e/system-locale.spec.ts` | 🟡 Coverage independently reviewed (real); awaiting final integrated release gate |
| Task completion | ≥90% unassisted completion in a moderated session with 5+ participants ("generate and download a Wi-Fi QR with a logo") | Manual session + observation notes | ⏸️ |
| First-attempt download | ≥95% (moderated session) | Same | ⏸️ |
| Mobile task completion | ≥90% (390×844, step/sheet flow) | Manual session + `e2e/mobile-studio.spec.ts` | 🟡 Automated coverage written; awaiting final integrated green and manual session |
| Raw error leakage | 0 | `e2e/export-localization.spec.ts` | 🟡 Comprehensive automated evidence available; awaiting final integrated review |
| Accessibility | Core flow completable by keyboard; WCAG AA text contrast | Manual audit + theme test | 🔄 Coverage test exists; manual audit and final run pending |
| On-device scanning | Successful on at least 3 devices/OSes | Manual record form | ⏸️ |

---

## 13. Test matrix and quality gates

### 13.1 Unit tests (Vitest, `npm run test`)

| Area | Files | What it proves |
| --- | --- | --- |
| Content/validation | `src/lib/content.test.ts` | URL/email/Wi-Fi, IPv4, byte length, truncation, TR/EN errors |
| QR/ECC | `src/lib/qr.test.ts` | Real matrix, automatic level, locked overflow, TR/EN messages |
| Decoders | `src/lib/decode.test.ts` | 2 independent decoders (jsQR + ZXing), PNG/SVG rasterization, module centers |
| Fonts | `src/lib/fonts.test.ts` | 6 subsets, Turkish glyph coverage, label fitting, `@font-face` generation |
| Geometry/shape | `src/lib/geometry.test.ts`, `src/lib/shapes.test.ts` | Frame layout, label shrinking, path geometry |
| Scene | `src/lib/scene.test.ts` | Proportion preservation in preview/PNG/SVG, logo ratio |
| Color/warnings | `src/lib/colors.test.ts`, `src/lib/warnings.test.ts` | Contrast, palettes, warning IDs and localization |
| Logo | `src/lib/logo.test.ts`, `src/hooks/logoReadiness.test.ts` | Type/size/pixel limits, error codes, race conditions |
| Export errors | `src/lib/render/exportErrors.test.ts` | TR/EN mapping without raw message leakage |
| Language/theme | `src/lib/locale.test.ts`, `src/theme/theme.test.ts`, `src/lib/presets.test.ts` | Defaults, persistence, translation, OS tracking |
| Language preference | `src/i18n/localePreference.test.ts` | System language detection, explicit preference priority, storage safety |
| Layout math | `src/lib/layout.test.ts` | Rail height and artifact fitting (contain) limits |
| SVG safety | `src/lib/render/svg.test.ts` | `escapeXml` and escaping against image `href` attribute injection |

**Coverage note:** The table above lists test **sources**; the unit suite passed green in the
integrated automated run (2026-10-04). This PRD is not a CI report and does not freeze
numeric results; real-device/manual verification and performance measurement are still
pending. Unless stated otherwise, "evidence" columns indicate that a test exists, not that
the manual release is green.

### 13.2 End-to-end tests (Playwright, `npm run test:e2e`)

| File | Coverage |
| --- | --- |
| `e2e/studio.spec.ts` | Flows, validation, frame/color/shape, logo, PNG/SVG download and decoding, network isolation, keyboard, multi-byte capacity, logo races, SVG metrics, font delay, mobile mini live QR view |
| `e2e/i18n.spec.ts` | TR/EN flows, error localization, language persistence, payload/design immutability, mobile top bar, logo races |
| `e2e/theme.spec.ts` | OS tracking, preference persistence, storage keys, PNG immutability, dark contrast, first paint |
| `e2e/export-localization.spec.ts` | Export error localization, recovery, language change mid-operation |
| `e2e/sticky-preview.spec.ts` | Desktop (1440×900, 1366×768, 1280×600; tr/en): warnings readable without expansion, rail computed `sticky` and pinned below the top bar, in-viewport canvas, no horizontal overflow, and PNG download; clear-preview rail retention. Footer-collision protection and desktop-rail absence in the mobile branch are product criteria without a dedicated assertion in the current spec |
| `e2e/system-locale.spec.ts` | System language detection, explicit preference priority, pre-paint `lang`/`title`, tracking system language changes, QR state unchanged |
| `e2e/mobile-studio.spec.ts` | Approved mobile design acceptance matrix (Section 13.3); 320×568, 390×667/844, and 844×390 viewports, 44×44 px touch targets at 320×568/390×844, reduced motion, safe area simulated with CSS variables, and visual keyboard simulated with `visualViewport` are covered automatically; independent review accepted, passed green in the integrated automated run (2026-10-04); physical device/manual verification pending |

> The integrated automated E2E suite passed green without retries on 2026-10-04; desktop
> and mobile test files exist. This does not replace real-device/manual verification;
> physical devices, a comprehensive browser matrix, and performance budgets still await
> manual/parent verification.

### 13.3 Approved mobile design acceptance matrix

This matrix is the testable counterpart of FR-MOB-01…12. `e2e/mobile-studio.spec.ts`
contains the automated coverage; the automated evidence passed green in the integrated run
(2026-10-04) and independent review accepted it; real-device verification is pending.
"Coverage" indicates whether the test exists, while "Verification" indicates the
final/manual state; the two are kept separate. Simulated safe area, visual keyboard
simulated via `visualViewport`, 44 px measurement separately at 320/390, and reduced
motion are covered by automated assertions; the physical notch/keyboard/camera await
manual testing and **do not count as verified.**

| ID | Scenario | Expected result | Coverage | Verification |
| --- | --- | --- | --- | --- |
| MOB-A1 | 320×568 / 390×844, long page scroll | Mini QR is sticky and fully visible below the top bar; drawn from the real matrix; does not collide with the topbar | Present in spec (real payload decoding + stability in deep design) | Passed in the automated run (2026-10-04); manual/physical pending |
| MOB-A2 | Tapping the mini QR | Sheet opens; large QR fits the width; PNG size + PNG/SVG download visible | Present in spec | Passed in the automated run (2026-10-04); manual/physical pending |
| MOB-A3 | Keyboard while the sheet is open | Focus stays inside the sheet; background `inert`; Esc closes; focus returns to the trigger | Present in spec (modal, Esc, focus return, background lock) | Passed in the automated run (2026-10-04); manual/physical pending |
| MOB-A4 | Content ↔ Design step | Full-width steps; no right column; content/design/logo preserved | Present in spec | Passed in the automated run (2026-10-04); manual/physical pending |
| MOB-A5 | Sheet open/close | Payload, matrix, and design unchanged; no field resets | Present in spec | Passed in the automated run (2026-10-04); manual/physical pending |
| MOB-A6 | TR↔EN, light↔dark | UI changes; payload/design/QR output unchanged; layout intact | Present in spec | Passed in the automated run (2026-10-04); manual/physical pending |
| MOB-A7 | Resize 390 → 1440×900 (desktop threshold ≥1024 px) | Same state preserved; desktop switches to two columns; no hidden/duplicate form | Partially in spec (mobile→desktop data preservation; current test is 390×844 → 1440×900) + code review | Passed in the automated run (2026-10-04); manual/physical pending |
| MOB-A8 | 320×568 and 390×844 | No horizontal overflow; action bar respects safe area; touch targets ≥44×44 (requirement) | Automated in spec: 320×568/390×844 overflow; 44 px measured **at both 320×568 and 390×844** (including TR/EN reset); safe area simulated with CSS variables, keyboard with `visualViewport` | Physical notch/keyboard pending — not counted as verified on a real device |
| MOB-A9 | Warnings | Open on demand; do not push the mini QR down; summary accessible | Present in spec (counter + sheet warnings section) | Passed in the automated run (2026-10-04); manual/physical pending |
| MOB-A10 | Mini QR → PNG/SVG | Same scene; PNG decodes; SVG decodes when rasterized | Present in spec (PNG/SVG download + decode) | Passed in the automated run (2026-10-04); manual/physical pending |
| MOB-A11 | `<1024` breakpoint | Mobile presentation active; desktop form is not rendered into the DOM a second time | Partially in spec (mobile studio visible, data preservation) + code review; a direct desktop-rail absence assertion is not present | Passed in the automated run (2026-10-04); manual/physical pending |
| MOB-A12 | `prefers-reduced-motion` | Sheet/transition animations are simplified | Automated in spec (emulated reduced motion: pulse/rotation off, transition duration ~0) | Passed in the automated run (2026-10-04); manual/physical pending |

### 13.4 Viewport matrix

| Width × height | Role | Coverage | Status |
| --- | --- | --- | --- |
| 320 × 568 | Small phone | No horizontal overflow; top bar does not overflow; bottom bar does not cover content; 44 px touch target measured automatically (320×568 and 390×844) | 🟡 Automated in spec; passed in the automated run (2026-10-04); manual pending |
| 320 × 800 | — | No longer used; replaced by 320×568 | — |
| 390 × 667 | Short phone | Sheet and download remain usable on a short screen | 🟡 Automated in spec; passed in the automated run (2026-10-04); manual pending |
| 390 × 844 | Typical phone | Approved mobile flow (mini QR, steps, sheet, download) | 🟡 Automated in spec; passed in the automated run (2026-10-04); manual pending |
| 844 × 390 (landscape) | Phone landscape | Sheet and download reachable on a short screen | 🟡 Automated in spec; passed in the automated run (2026-10-04); manual pending |
| 768 × 1024 | Tablet | Single-column mobile branch | 🔄 Coverage planned/manual |
| 1024 × 768 | Small laptop | Two-column threshold (lg=64 rem); measured sticky rail | 🔄 Coverage planned; sticky spec uses 1280/1366/1440 |
| 1366 × 768 | Common laptop | Measured rail; QR and downloads visible | 🟡 Sticky spec exists; passed in the automated run (2026-10-04); manual pending |
| 1280 × 600 | Short screen | Sticky rail, in-viewport canvas, no horizontal overflow, and PNG download | 🟡 Sticky spec exists; passed in the automated run (2026-10-04); footer-collision protection is not asserted by the current spec; manual pending |

### 13.5 Quality gates

| Gate | Command / criterion | Requirement |
| --- | --- | --- |
| Type safety | `npm run typecheck` | On every change |
| Lint | `npm run lint` | On every change |
| Unit tests | `npm run test` | On every change; the full unit suite must be green (no fixed number) |
| Production build | `npm run build` | Before release |
| Full check | `npm run check` (typecheck + lint + test + build) | Before release |
| E2E suite | `npm run test:e2e` (studio, i18n, system-locale, theme, export-localization, sticky, mobile) | Before release; the integrated automated run passed green without retries on 2026-10-04; real-device/manual verification is additionally pending |
| Decoder gate | 2 decoders on plain designs; at least 1 on decorative shapes | Before release |
| Privacy gate | Zero external network requests | Before release |
| Device gate | Scanning on at least 3 real devices | Before release (not done yet) |
| Public release gate | Section 19: secret, artifact, history, and personal path checks | Before public release |

### 13.6 Real-device verification (not done yet)

Automated tests read the QR with two independent software decoders; this **does not replace
real phone camera verification.** Print quality, screen brightness, camera focusing, and
operating system browser differences only show up on a physical device. Planned
verification: at least 3 devices (iOS + two Android manufacturers), 3 output types
(screen PNG, 1024 print, SVG rasterization), and a low-contrast/dense-content scenario.

---

## 14. Requirements traceability

| Requirement group | Automated evidence | Manual check |
| --- | --- | --- |
| FR-CON | `src/lib/content.test.ts`, `e2e/studio.spec.ts`, `e2e/i18n.spec.ts` | Trying `mailto:` in a real email client |
| FR-QR | `src/lib/qr.test.ts`, `src/lib/decode.test.ts`, `e2e/studio.spec.ts` | Scanning dense content with a phone camera |
| FR-FRM | `src/lib/geometry.test.ts`, `src/lib/decode.test.ts`, `e2e/studio.spec.ts` | Label legibility in print |
| FR-LGO | `src/lib/logo.test.ts`, `src/hooks/logoReadiness.test.ts`, `e2e/studio.spec.ts`, `e2e/i18n.spec.ts` | Visual check with different logo aspect ratios |
| FR-CLR | `src/lib/colors.test.ts`, `src/lib/warnings.test.ts`, `e2e/studio.spec.ts` | Low-contrast print test |
| FR-PRS | `src/lib/presets.test.ts`, `e2e/studio.spec.ts`, `e2e/i18n.spec.ts` | Visual consistency of the 8 presets |
| FR-PRV | `src/lib/warnings.test.ts`, `src/components/PreviewPanel.tsx` (live region), `e2e/studio.spec.ts` | Clarity of warning copy |
| FR-EXP | `src/lib/decode.test.ts`, `src/lib/scene.test.ts`, `src/lib/render/exportErrors.test.ts`, `src/lib/render/svg.test.ts`, `e2e/studio.spec.ts`, `e2e/export-localization.spec.ts` | Opening the SVG in Illustrator/Inkscape (knowing the font embedding limitation) |
| FR-LOC | `src/lib/locale.test.ts`, `src/i18n/localePreference.test.ts`, `e2e/i18n.spec.ts`, `e2e/system-locale.spec.ts` | Opening the browser with TR/EN/various language scenarios |
| FR-THM | `src/theme/theme.test.ts`, `e2e/theme.spec.ts` | Changing the OS theme live |
| FR-UI | `e2e/sticky-preview.spec.ts` (current spec: sticky rail, in-viewport canvas, no horizontal overflow, PNG download), `e2e/mobile-studio.spec.ts`, `src/lib/layout.test.ts` | Real-screen check at 1280×600 and 1366×768 |
| FR-MOB | `e2e/mobile-studio.spec.ts` (automated coverage written; awaiting final integrated green) | Step/sheet/download flow on a real phone; physical notch/keyboard/camera manual |
| FR-A11Y | `e2e/studio.spec.ts` (keyboard), `e2e/mobile-studio.spec.ts` (dialog/44 px/simulated safe area/reduced motion), `e2e/theme.spec.ts` (contrast) | Screen reader (VoiceOver/NVDA) pass; 48 px target and physical safe area measured manually |
| FR-PRVY | `e2e/studio.spec.ts` (network), `e2e/theme.spec.ts` (storage) | Trying blocked storage in browser private mode |

---

## 15. Known limitations and risks

### 15.1 Known limitations

- **No scan guarantee:** The app generates a correct matrix and warns about risks; print
  quality, surface, and scanner differences affect the result. Scan with a phone before printing.
- **Decorative shapes:** Discrete modules such as dot/diamond can challenge rigid
  decoders in very dense content; the app warns, and square modules are the most reliable option.
- **Decoder differences:** jsQR may fail on some decorative shapes while ZXing and
  phone cameras can read them; ZXing JS has a known behavioral difference at certain pixel
  alignments. The test threshold is defined accordingly.
- **SVG label:** Some vector editors (e.g., Illustrator) ignore `@font-face` rules and draw
  the label with a system font; PNG is recommended for an exact match.
- **SVG metadata and QR disclosure:** The exported SVG carries only a generic,
  localized, secret-free `aria-label` via `role="img"`; the raw payload (including the
  Wi-Fi password) is not embedded in the title — this behavior **is implemented in the
  source** and a regression test exists (`e2e/mobile-studio.spec.ts`; automated run green,
  independent review accepted). **No `<title>` element is written to the SVG:** the `sceneToSvg` option
  carries the name `title`, but its value is written to the `aria-label` attribute, and it
  does not produce a separate `<title>`. The raw SVG API lets the caller pass an explicit
  title/`aria-label` (stays compatible). However, the QR pattern carries the encoded
  content **by design** and can be scanned by anyone — **this is not encryption.** Labels
  and logo are real user input; embedded logo images may carry EXIF metadata (a separate
  warning topic).
- **Capacity:** The UI caps at 1200 UTF-16 code units; the real limit is bytes and is
  resolved by automatic level downgrade. Very dense codes scan at sufficient size.
- **URL validation is heuristic:** Local network names are accepted only with a
  scheme/port; internationalized domain names (IDN) and custom schemes are not supported.
- **Logo is raster only:** SVG is rejected due to script execution risk.
- **Wi-Fi compatibility:** The standard `WIFI:` format is used; some operating systems
  may behave differently on hidden networks or with WEP.
- **PNG sizes** are limited to 512/1024/2048 px; SVG scales with a 1000-unit viewBox.
- **Label fitting limit:** `fitCaption` shrinks the label by at most 55% (floor: 45% of
  the base size). With very wide glyphs or overlong labels this floor may allow overflow; the
  app shows a warning for long labels and suggests shorter text. There is no universal
  "never overflows" guarantee; exact fitting is a future acceptance/manual test topic.
- **Mobile:** The approved "Live mini QR" flow is in the repository (`MobileStudio`, <1024).
  The automated spec covers 320×568, 390×667/844, and 844×390 viewports, 44 px touch
  targets at 320×568/390×844, reduced motion, safe area simulated with CSS variables, and
  visual keyboard simulated with `visualViewport`; the automated run is green and
  independent review accepted it. Physical notch, keyboard, and phone camera checks await
  manual testing.
- **System language detection:** Implemented and independently reviewed; tr/en is selected
  in `navigator.languages` order, falling back to English for unsupported system languages.
- **Accessibility:** The native `<dialog>` modal pattern (X/Esc, focus return, background
  lock; does not close on outside click) is implemented; the 44 px touch target is measured
  automatically at both 320×568 and 390×844. The 48 px target, physical safe area, and
  screen reader pass have not yet been independently audited.
- **Languages:** TR/EN only; RTL layout is not supported.
- **Browser support:** Modern evergreen browsers are targeted; export requires `Path2D`
  and Canvas 2D.

### 15.2 Risks

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Printed code does not scan | User trust and business outcome | Medium | Warnings, two-decoder tests, device verification, pre-print scan reminder |
| Mobile work breaks the desktop layout | Regression | Medium | <1024 breakpoint, single source of state, sticky tests, `mobile-studio.spec.ts` |
| Language detection picks an unexpected language | UI in the wrong language | Low | Ordered detection + EN fallback; explicit choice always wins; test examples |
| Storage blocked | Preference loss | Low | Safe defaults; no crash |
| Font subset fails to load | System font in SVG | Low | Continue with remaining subsets; error swallowed; PNG alternative |
| Capacity overflow stays silent | Empty/incomplete code | Low | Action call at locked level + export lock (tested) |
| Scope creep (dynamic QR/accounts) | Architecture and privacy promise | Low | Non-goals explicit; not even added to the P2 list |
| Real-device verification is deferred | Release quality | Medium | Mandatory gate in the delivery checklist |

---

## 16. Deferred roadmap (P2)

| Topic | Why it was deferred | What is needed before starting |
| --- | --- | --- |
| Additional languages (e.g., German, Arabic) | Translation and RTL layout expand the scope | Product decision + RTL design work |
| PWA / offline install | The current app is already client-only; a service worker adds maintenance burden | Caching strategy and update flow |
| Batch generation / CSV import | A different product surface | Separate PRD and performance targets |
| Print presets (mm/DPI, bleed) | Requires print workflow knowledge | Printer requirements |
| New content modes (vCard, location, SMS) | Out of P0 scope | Validation and escaping tests |
| More frames/shapes | The current 7+7 is sufficient; test load increases | Design and decoder tests |
| CSP and security headers | Depends on the deployment environment | Hosting infrastructure decision |
| Dynamic QR | Conflicts with the backend, account, tracking, and privacy promise | **Explicit product decision and separate architecture; not an automatic requirement** |

---

## 17. Delivery checklist

| # | Work | Status | Owner / note |
| --- | --- | --- | --- |
| 1 | Core product (P0) code + unit test sources | ✅ | Test sources exist; the unit suite passed green in the integrated automated run (2026-10-04) |
| 2 | End-to-end green run of the E2E suite | ✅ | The integrated automated run passed green without retries on 2026-10-04; real-device/manual verification is additionally pending |
| 3 | System language detection (FR-LOC-01/03/07) | ✅ | Implemented and independently reviewed; unit + E2E sources exist and passed green in the integrated automated suite (2026-10-04) |
| 4 | Desktop sticky fix (FR-UI-02) | ✅ | Measured viewport bound, pinned QR/actions verified in the automated run; independent review accepted; real-screen/manual verification pending |
| 5 | Mobile "Live mini QR" implementation (FR-MOB-01…11) | ✅ | Present in the repository; <1024 integration, no hidden forms; integrated automated run passed (2026-10-04); independent review accepted; real-device verification awaits manual testing |
| 6 | `e2e/mobile-studio.spec.ts` green | ✅ | Passed green in the integrated automated run (2026-10-04); independent review accepted; physical device verification awaits manual testing |
| 7 | Real-device scan verification | ⏸️ | At least 3 devices/OSes |
| 8 | Performance budget measurement | ⏸️ | Methods in Section 10 |
| 9 | Accessibility audit (48 px target, safe area, screen reader) | 🔄 | Dialog pattern and simulated safe area/reduced motion in automated tests; 48 px target, physical safe area, and screen reader await manual testing |
| 10 | Aligning README and PRD with the latest state | 🔄 | Being aligned source-accurately within this edit; main session/parent verification pending |
| 11 | Product owner approval | ⏸️ | Status of this document: pending approval |
| 12 | Public release gate (PUB-01…10) | ⏸️ | Secret/artifact/history scans; this gate is not a security approval |
| 13 | Final integrated verification (unit + E2E) | ✅ Automated part passed; manual pending | The integrated automated run passed green without retries on 2026-10-04; real device, performance budgets, and parent approval pending; this PRD makes no claim of completed manual QA |

---

## 18. Open questions

1. **Is mobile scope approval complete?** The "Live mini QR" decision is approved; is a
   scope change (e.g., showing warnings on a separate page outside the sheet) needed while
   implementation is in progress?
2. **Language detection edge cases:** Is the behavior clear when `navigator.languages` is
   empty or contains only regional codes? (Suggestion: EN if empty; `tr-*`/`en-*` prefix matching.)
3. **Visibility of the detected language:** Should the user be told "detected automatically",
   or should it stay silent?
4. **Performance thresholds:** Are the targets in Section 10 acceptable to the product
   owner? Which device class will be used as the reference?
5. **Browser support:** Will a minimum version matrix be defined for `dvh`, `color-mix`,
   and `Path2D` behavior on Safari/iOS?
6. **E2E infrastructure:** How will the dev server and parallel worker configuration be
   pinned in CI?
7. **Accessibility target:** If the 48×48 px target strains the compact mobile design,
   which takes priority?
8. **SVG metadata (decision 2026-10-04; implemented in source):** Instead of automatically
   embedding the entire payload (including the Wi-Fi password), the app writes **only a
   generic, localized, secret-free** `aria-label` with `role="img"` into the SVG
   (`ExportPanel` → `sceneToSvg`). The `sceneToSvg` option carries the name `title`, but its
   value is written to `aria-label`; **no separate `<title>` element is produced.** The raw
   SVG API lets the caller pass an explicit title/`aria-label` (stays compatible). A
   regression test exists for this behavior (`e2e/mobile-studio.spec.ts`: the raw Wi-Fi
   payload is not found in the SVG, and the QR still decodes); **awaiting independent final
   review.** Note: The QR pattern exposes the encoded content **by design** (anyone can
   scan it); this is not encryption. Labels and logo, however, are real user
   input/metadata; EXIF metadata that embedded logo images may carry is a separate warning topic.
9. **Productization status:** Will the repository remain an educational/demo project, or is
   a commercial product the goal? (Affects licensing, support, and privacy texts.)
10. **Will CSP and security headers be added at deployment?**
11. **Pre-release secret scan:** Which tool (gitleaks/trufflehog) and which version will be
    used; who will sign off on the result of the full history scan?

---

## 19. Public release gate

Purpose: eliminate data-leakage risks with **runnable checks** before the repository is made
public. This gate is not a security certificate; an independent security audit is a separate
process. A **working-tree pre-scan** was performed and found no verified secret/PII
findings; however, this is not a security guarantee, and because **there is no git history,
it was not evaluated**. The final snapshot must be re-checked after ongoing edits finish
and **explicit release authorization** is given.

Sample data policy: Only synthetic samples are used in the document and tests (such as
`example.com`, `<SSID>`, `ornek@example.com`). Real user content, Wi-Fi credentials, email
addresses, tokens, or keys do not appear in public content. The path/pattern strings in the
table below are **scan patterns**, not sample real values. The scope lists (including the
generic email pattern and extensionless SSH/auth files) are **examples; they do not claim
to be exhaustive** and do not mean that a scan was performed. The final secret/PII scan has
not been performed yet; the related gates are in ⏸️ status.

| ID | Control | Example method | Pass criterion | Status |
| --- | --- | --- | --- | --- |
| PUB-01 | Secret scan — working tree (local, redacted) | `gitleaks detect --no-git` or `trufflehog filesystem .` (local; credentials are not sent to the network) | **0 unresolved** sensitive findings. Synthetic/pattern self-matches (e.g., test fake values, scan patterns) are filtered out with justification. Looking only at "verified" findings is not enough; **unverified** findings are also reviewed manually | ⏸️ (pre-scan: no verified findings) |
| PUB-02 | Secret scan — full git history | `gitleaks detect` or `trufflehog git file://.` | 0 findings even for secrets deleted in history; if there is a finding, no release until keys are rotated and history is cleaned | ⏸️ **Not applicable / not evaluated**: there is no git history in this repository; it does not count as "passed". If history is created, it will be re-run |
| PUB-03 | Absolute/personal path scan | `git grep -n -E '/Users/\|/home/\|/private/var\|/tmp/'` (these are scan patterns, not sample paths) and for history `git log -p --all -S'/Users/'` | 0 matches; all paths repository-relative | ⏸️ (history part not evaluated) |
| PUB-04 | Person/session/job identity scan | `git grep -n -i -E 'session[_-]?id\|internal[_-]?job\|username\|kullanıcı adı'` + manual review | No person names, session, or job IDs in product documents | ⏸️ |
| PUB-05 | Tracked artifact check | `git ls-files` for `.env`, `.env.*`, `*.local`, `dist/`, `node_modules/`, `test-results/`, `playwright-report/`, `.playwright-mcp/`, `*.log`; private key/keystore formats (`id_rsa`, `id_ed25519`, `id_ecdsa`, `id_dsa`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.jks`, `*.keystore`) and credential files (`.git-credentials`, `.netrc`, `.authinfo`, `.envrc`, `credentials.json`, `service-account*.json`, `.aws/`; these are scan patterns, not real values) | **Preventive coverage is partial:** `.gitignore` genuinely covers some of the formats above. **Scan scope and `.gitignore` scope are not the same:** `known_hosts` (usually carries no credentials) and the bare `credentials` file name are **not currently ignored**; the broad example list in this row shows scanner scope, not the full `.gitignore` list. The root `.env.example` exception rule (`!/.env.example`) is defined, but the file **does not exist in the repository yet**; it is a placeholder to be kept only if the file is added later, and its existence is not claimed. This **does not mean the final scan passed** — the file list must still be verified separately with `git ls-files`. **`.gitignore` alone is not protection:** it does not hide files that are already tracked, force-added with `git add -f`, manually zipped, dropped under `.playwright-mcp/` as manual screenshots/YAML/downloads, or uploaded as release attachments; the actual file list is checked separately. The list is an example; it does not claim to be exhaustive, and the final scan has not been performed | ⏸️ (preventive coverage partial; final scan pending) |
| PUB-06 | Test/tool artifact check | `git ls-files test-results playwright-report .playwright-mcp` | 0 files; no traces, screenshots, videos, downloaded sample output, manual screenshots/YAML/downloads under `.playwright-mcp/`, or release attachments | ⏸️ |
| PUB-07 | Real data/sample scan | Generic email pattern (e.g., `git grep -n -E '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'`) + manual review; also real SSID/password/extensionless key patterns | Only synthetic `example.com` samples. **The patterns are examples; they do not promise exhaustiveness. Restricting email checks to a few consumer email providers is insufficient; use a general pattern and manual review.** The final scan has not been performed | ⏸️ |
| PUB-08 | Runtime network isolation | Network listener test in `npm run test:e2e` | 0 external network requests | Test exists; passed green in the integrated automated run (2026-10-04) |
| PUB-09 | Dependency/license check | `npm ls --all` + license list review | Licenses are documented; no incompatible or missing licenses. **`npm ls` is not a security vulnerability audit** (`npm audit` is separate) and does not replace full license verification | ⏸️ |
| PUB-10 | Documentation hygiene | PUB-03/04/07 scans over README and `docs/PRD.md` | 0 findings; documents are suitable for public release | ⏸️ |

Additional rules:

- **Only live and genuinely exposed** credentials are rotated. Fake/expired values or every
  historical value are not rotated wholesale; exposure is verified first.
- **Raw scan reports stay local** and are kept in a local directory covered by the
  repository/`.gitignore`; only a **redacted summary** is added to the release record. Scan
  tools are recorded with versions and outputs; "checked manually" alone does not count as
  sufficient evidence.
- **The final snapshot** is re-scanned after ongoing edits (desktop/mobile/locale scope)
  are complete and **explicit release authorization** is given.
- This gate is not the product's security approval; until the independent security audit is
  complete, the words "secure", "certified", or "audited" are not used anywhere.

---

## Appendix A — Glossary

| Term | Meaning |
| --- | --- |
| Payload | The actual data embedded in the QR matrix (URL, text, `mailto:`, `WIFI:`) |
| Static QR | A QR whose content is fixed at generation time and that needs no server |
| Dynamic QR | A QR whose target can be changed server-side via a short link (out of scope) |
| ECC / Error correction | L (7%), M (15%), Q (25%), H (30%) resilience levels |
| Quiet zone | The strip of empty modules around the QR; required by readers |
| Byte capacity | The real limit in UTF-8 bytes; fills up faster with multi-byte characters |
| Scene | The shared drawing model for preview, PNG, and SVG |
| Subset | A language/script-based portion of a font; selected via `unicode-range` |
| Inert | An accessibility state that disables interaction and focus |
| Safe area | The safe layout inset for a notch/home indicator |

## Appendix B — Decision log

| Date | Decision | Rationale | Status |
| --- | --- | --- | --- |
| 2026-10-04 | "Live mini QR" mobile design approved | Real QR proof, one-handed use, accessible download | Implemented (integration/final QA in progress) |
| 2026-10-04 | Dynamic QR out of scope | Conflicts with the backend/account/tracking, privacy, and local-operation promise | Permanent |
| 2026-10-04 | Persistent data is theme and language preference only | Privacy; QR data is never stored | Implemented |
| 2026-10-04 | SVG logo rejected | Script execution risk | Implemented |
| 2026-10-04 | System language detection | Adapt the user experience to the browser language | Implemented; independently reviewed |

## Appendix C — Source file references

| Topic | File |
| --- | --- |
| Main layout | `src/App.tsx`, `src/lib/layout.ts`, `src/hooks/useStickyRailHeight.ts`, `src/styles/preview-layout.css` |
| Mobile | `src/components/MobileStudio.tsx`, `src/hooks/useMobileStudioLayout.ts`, `src/styles/mobile-studio.css` |
| Content/validation | `src/lib/content.ts`, `src/lib/types.ts`, `src/lib/defaults.ts` |
| QR/ECC | `src/lib/qr.ts` |
| Frame/shape/color | `src/lib/geometry.ts`, `src/lib/shapes.ts`, `src/lib/colors.ts` |
| Warnings | `src/lib/warnings.ts` |
| Logo | `src/lib/logo.ts`, `src/hooks/logoReadiness.ts` |
| Scene/export | `src/lib/render/scene.ts`, `src/lib/render/canvas.ts`, `src/lib/render/svg.ts`, `src/lib/render/export.ts`, `src/lib/render/fontEmbed.ts` |
| Language/theme | `src/i18n/I18nProvider.tsx`, `src/i18n/localePreference.ts`, `src/lib/locale.ts`, `src/theme/theme.ts`, `src/theme/ThemeProvider.tsx` |
| Components | `src/components/*.tsx` |
| Tests | `src/**/*.test.ts`, `e2e/*.spec.ts` |
