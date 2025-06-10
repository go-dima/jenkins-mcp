import { TOOL_IDS } from "../consts/toolIds.js";

// This map is used to add tailored descriptions to the base tool descriptions,
export const TOOL_TAILORED_DESCRIPTIONS = {
  [TOOL_IDS.SANITY_CHECK]: {
    description: "",
  },
  [TOOL_IDS.SEARCH_JOBS]: {
    description: "",
  },
  [TOOL_IDS.LIST_JOBS]: {
    description: "",
  },
  [TOOL_IDS.BUILD_WITH_PARAMETERS]: {
    description: "",
  },
  [TOOL_IDS.FETCH_FROM_JENKINS]: {
    description: "",
  },
  [TOOL_IDS.INVOKE_REQUEST]: {
    description: "",
  },
} as const;
