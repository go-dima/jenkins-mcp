import { TOOL_IDS } from "../consts/toolIds.js";

export const TOOL_DESCRIPTIONS = {
  [TOOL_IDS.SANITY_CHECK]: {
    description:
      "Test connectivity and authentication with your Jenkins server. This verifies that the server is reachable and your credentials are working correctly.",
  },
  [TOOL_IDS.SEARCH_JOBS]: {
    description:
      "Search for Jenkins jobs by keyword or pattern. This helps you discover available jobs when you don't know the exact job name. Returns matching jobs with their paths and types.",
  },
  [TOOL_IDS.LIST_JOBS]: {
    description:
      "List all jobs within a specific Jenkins folder and repository structure. Use this to browse the hierarchical organization of your Jenkins jobs. Optionally specify a branch to see branch-specific jobs.",
  },
  [TOOL_IDS.BUILD_WITH_PARAMETERS]: {
    description:
      "Trigger a Jenkins build with custom parameters. This starts a new build job with the specified configuration. Supports environment variables, version numbers, deployment targets, and other custom parameters defined in the job.",
  },
  [TOOL_IDS.FETCH_FROM_JENKINS]: {
    description:
      "Retrieve raw data from any Jenkins API endpoint. This is a powerful generic tool for accessing Jenkins data that isn't covered by other specific tools. Useful for custom integrations and advanced Jenkins API usage.",
  },
  [TOOL_IDS.INVOKE_REQUEST]: {
    description:
      "Execute any HTTP request to Jenkins with full control over method and parameters. This is the most flexible tool for advanced Jenkins operations like creating jobs, updating configurations, or performing administrative tasks.",
  },
} as const;
