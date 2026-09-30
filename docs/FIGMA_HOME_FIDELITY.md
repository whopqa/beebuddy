# Home design alignment

Current reference: Figma file `VeeHYy9MyfRTlSYTHPQTov`, node `1:2`, selected by the user. Earlier passes used the copy `Yk55zRs0EPvfSUdguvtFsH`.
Design context, screenshot and recursive motion context read on 2026-09-29.

## Implemented in this pass

- Scoped desktop Home stylesheet; other functional screens and Admin unchanged.
- Header over hero instead of occupying an extra row; hero gradients, copy and CTA positions.
- Feature cards, About, Buzzy, Services, Community and Footer dimensions/spacing.
- Community image/caption frames use the asymmetric corners in the design.
- Existing 14 exported animation tracks retain the 42.5-second Figma timeline.
- Marquee has two identical 3399px cycles to avoid an empty tail/reset seam.
- Reduced-motion handling covers the hover helpers as well as timeline animation.
- Read the current Figma file's prototype reactions: Header Community now scrolls to the Home section. All three Community cards use their actual hover copy, alternating rounded corners, dark gradient, Members link and 300 ms ease-out dissolve rather than image zoom. The Members links open the existing Community page.
- Buzzy trait pills use the Figma variant colors and 300 ms enter/leave transitions; feature-card reveal uses the 500 ms prototype timing.
- Desktop browser check verified the Community anchor, all three hover variants, Members navigation, and locally loaded SVG overlay. `npx tsc --noEmit` and the final `npm run build` passed.
- A full-card Community link is available below 1100px, where the desktop hover layer is hidden. Browser verification at 900px confirmed navigation to `/community`; desktop appearance is unchanged. TypeScript passed after this adjustment.

Measured desktop section starts in the browser (CSS px): hero 0, features 800,
About 1016, Buzzy 2076, Services 2866, ticker 3791, accent 3852,
Community 3945, Footer 5251. Page height: 6251.

## Community refinement from the selected reference

- Connector access succeeded after one authentication retry on 2026-09-29.
- Read the Home screenshot and detailed contexts/screenshots for `194:3357`, `194:3359`, and `194:3284`.
- Downloaded original Community photos, caption icons, and the Foodies hover SVG to local assets. Removed emoji caption icons.
- Corrected photo crops, distinct caption positions, hover overlay slots, and Members positions. Photos stay in their original image slots beneath the overlay, rather than stretching to cover the whole hover panel.
- The previous assumption that hover required separate photos was incorrect for this file: the contexts use the same photos with a different overlay. The downloaded reference files replace the previous local exports.
- Browser checked all three variants via keyboard focus at a 1440px viewport; every Community image/icon/SVG loaded successfully. TypeScript passed. Backend and Admin were not changed.

## Not yet verified / not a 100% fidelity claim

### Header / Hero / feature-card rebuild

- Reference prototype: `VeeHYy9MyfRTlSYTHPQTov`, Home `1:2`.
- Re-read Home design and recursive motion; preserved the five slideshow opacity tracks on their shared 42.5s timeline.
- Replaced earlier desktop Header/Hero/feature overrides in `figma-home.css` with scoped `figma-home-intro.css`; removed the feature-card flex row and negative title margin.
- Original Header/Hero/feature assets downloaded as `intro-*`. Home-only header asset mode leaves other screens' shared header unchanged.
- Feature icons and labels now have separate measured slots. Smaller desktop widths use smaller label type; narrow screens use a two-column card grid rather than absolute desktop positions.
- Local verification on port 3001: all in-scope img assets loaded; labels and icons separated at rest and settled keyboard-focus state; responsive 900px and 390px have no page horizontal overflow. The three 390px cards have a 16px icon/text gap and contained titles. Drawer open/close and authenticated Header Community navigation to `/home#community` passed. TypeScript passed.
- Existing feature hover timing remains a transition approximation: MCP motion context does not export Smart Animate transitions. The transient font-family switch is clipped to the label slot to prevent text painting outside the card. Do not describe this as exact prototype interpolation.
- Sign-in/up and feature destinations retain existing application routing. The Google Play badge still leads to signup because no store URL was supplied.

- The remaining screens/authenticated Home have not been fully inspected. Fresh connector access to the selected reference now works; earlier permission failures concerned another copy/account connection.
- Figma prototype reactions exposed triggers, destinations, timing and easing, but Smart Animate's intermediate interpolation is not exported by motion context. The implemented feature/trait hover remains an approximation of the transition despite matching the known endpoints more closely.
- Some design font weights/italic faces and Finlandica are not available locally.
- Static decorative lens layers and the source animated bee require further asset
  comparison. Existing local assets are reused; no fabricated motion added.
- Responsive layouts remain the existing implementation: the supplied reference is
  desktop, not evidence of exact mobile breakpoints.
- Backend integration is preserved but full authenticated API flows were not
  retested during this visual-only pass.
