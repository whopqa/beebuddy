# Login alignment

Reference: file `VeeHYy9MyfRTlSYTHPQTov`, frame `87:151`.
Read design context and screenshot on 2026-09-29. Recursive motion context
returned no animated nodes; no new timeline effects were invented.

Implemented scoped desktop form measurements in `app/figma-login.css`:
form width 480px; heading 75px; fields 75px with 24px gaps; options 20px;
submit 52px; divider 19px; hero copy at y=513px relative to its image.
Existing API handlers, Google identity integration and all other auth modes
remain unchanged. TypeScript validation passed.

Browser measurements confirm offsets relative to the form container:
email y=131, password y=230, options y=329, submit y=368, divider y=440.

Remaining differences: Google renders its own button; the consent disclosure
is retained even though absent from the Figma frame; Apple remains disabled.
2026-09-29 follow-up: reused original header assets and downloaded the hero
base, eye, Google/Apple, checkbox check and white footer logo assets. Hero
uses the two original layers and the 211.5% crop from design context.
Header/footer desktop slots and the checkbox appearance are scoped to Login.
The Apple SVG is 24x28 without the previous global invert filter.

Browser checked at 1440x919 and 390x844: visible image assets loaded,
no horizontal overflow; checkbox, show-password and empty-form validation
work. Existing authenticated header behavior is retained rather than forcing
sign-in actions on a signed-in account. TypeScript and diff checks pass.
Recursive motion context for this canonical frame returned `nodes: []`;
prototype hover/click transition timings are not verified by that result.
This pass is not a claim of 100% visual fidelity.
