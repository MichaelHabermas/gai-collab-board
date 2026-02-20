import preferFalsyOverExplicitNullish from "./prefer-falsy-over-explicit-nullish.js";
import maxUseEffectCount from "./max-use-effect-count.js";
import noUnnecessaryUseCallback from "./no-unnecessary-use-callback.js";

export default {
  rules: {
    "prefer-falsy-over-explicit-nullish": preferFalsyOverExplicitNullish,
    "max-use-effect-count": maxUseEffectCount,
    "no-unnecessary-use-callback": noUnnecessaryUseCallback,
  },
};
