# anti-slop (Effect rules only)

- Source: https://github.com/dmmulroy/anti-slop
- Commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (last change to the skill assets: `e6676e8d0bf17c678cb45b9dacb2bd6ca8dea53a`)
- Copied from: `skills/install-anti-slop/assets/anti-slop/effect/` → `tools/oxlint/anti-slop/effect/`
- Registered in `oxlint.config.ts` as the `anti-slop-effect` JS plugin, with all five rules at `error`.

## Deviations

- Only the Effect plugin is vendored. The generic `anti-slop` rules come from Ultracite's bundled preset (`ultracite/oxlint/anti-slop`), so the generic plugin is not copied or registered here.
