# APCA contrast audit — 2026-10-22

**Project:** Малая геодезия  
**Repository:** https://github.com/alexthanks10039/malaya-Geodesia  
**Scope:** source-level review of selected color pairs; this is not a complete accessibility conformance audit.

## Summary

The sampled palette has strong contrast for primary text and the lime accent, but some muted text colors are weak for small labels, especially in the terrain/HUD interface and in pale blue text on a light background.

APCA reports signed Lightness Contrast (Lc): positive values usually indicate dark text on a light background; negative values indicate light text on a dark background. Lc must be interpreted together with font size, weight, and use case. The values below are approximate results recorded from the sampled color pairs, rounded to one decimal place.

## Sampled color pairs

| Text | Background | Approx. APCA Lc | Review |
|---|---|---:|---|
| `#10130f` | `#eceee7` | +94.6 | Strong primary text contrast |
| `#42483f` | `#eceee7` | +81.2 | Good contrast |
| `#687066` | `#f9faf4` | +72.0 | Better, but verify for very small text |
| `#687066` | `#eceee7` | +64.7 | Limited margin for small text |
| `#7e847b` | `#eceee7` | +55.2 | Weak for small text |
| `#687066` | `#dfe2d8` | +57.5 | Weak for small text |
| `#aab2a5` | `#0c100d` | −58.8 | Limited margin for small text |
| `#8f9c91` | `#0b100d` | −46.6 | Weak for small HUD labels |
| `#8b9d9b` | `#071014` | −47.0 | Weak for small HUD labels |
| `#b4c6c4` | `#071014` | −69.5 | Improved; validate against actual type |
| `#c3d6cd` | `#071014` | −78.6 | Good contrast |
| `#d9ff52` | `#0b100d` | −97.7 | Strong accent contrast |
| `#f9faf4` | `#0c100d` | −103.8 | Strong contrast |
| `#b8c5ff` | `#f9faf4` | +26.5 | Very low; avoid for important text |

## Recommended follow-up

1. Darken muted text tokens in the light theme, especially `#687066` and `#7e847b`, while preserving the intended hierarchy.
2. Lighten low-contrast HUD labels on dark backgrounds. Avoid relying on colors around Lc 45–50 for tiny labels.
3. Do not use `#b8c5ff` as important text on `#f9faf4`; choose a darker blue or use it as a non-text decorative accent.
4. Re-check disabled states: contrast requirements for inactive controls differ, but the state must still be communicated clearly.
5. Run automated checks (for example, axe-core) and manual keyboard, 200% zoom/reflow, screen-reader, and mobile tests.
6. Test rendered screenshots and composited backgrounds, especially text over the dynamic terrain scene. The values above assume opaque, flat foreground/background colors and do not account for transparency, gradients, images, or antialiasing.

## Limitations

- This is a sampled source-color check, not a full audit of every page, component, theme, or state.
- No live browser screenshot, rendered terrain sampling, automated axe-core run, or manual assistive-technology test was completed for this record.
- APCA is not a replacement for WCAG 2 contrast-ratio checks and does not itself establish WCAG 2 conformance. WCAG 2 AA checks should still be run separately (typically 4.5:1 for normal text and 3:1 for large text, subject to the criterion's exceptions).
- APCA thresholds depend on typography and intended use; this report uses qualitative flags rather than claiming universal pass/fail based on Lc alone.

## References

- APCA implementation: https://github.com/Myndex/apca-w3
- APCA project documentation: https://git.apcacontrast.com/documentation/
- WCAG 2.2 Recommendation: https://www.w3.org/TR/WCAG22/
- WCAG 2 contrast minimum: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
