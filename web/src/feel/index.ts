// Feel kit, copied from mosaic-rush (web/src/feel + web/src/motion).
// TODO: switch these imports to `@freegamestore/games/feel` once the SDK is published
// to npm with that subpath. `@freegamestore/games@0.16.0` has no feel export yet.
export { ParticleLayer, type ParticleLayerHandle } from "./ParticleLayer";
export { ScorePop } from "./ScorePop";
export { HAPTICS, vibrate, type VibrationPattern } from "./haptics";
export { useHaptics } from "./useHaptics";
export { useShake } from "./useShake";
export { shakeKeyframes } from "./shake";
export type { BurstOptions } from "./particles";
export { prefersReducedMotion } from "../motion/reducedMotion";
