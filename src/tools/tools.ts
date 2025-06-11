import { z } from "zod";
import { ToolIDs } from "../consts/toolIds.js";
import {
  handleBuildWithParameters,
  handleFetchFromJenkins,
  handleInvokeRequest,
  handleListBuilds,
  handleSanityCheck,
  handleSearchJobs,
} from "../handlers.js";
import { ToolDescriptions } from "./tools.types.js";

const ToolsConfig: ToolDescriptions = {
  [ToolIDs.SANITY_CHECK]: {
    description:
      "Test connectivity and authentication with your Jenkins server. This verifies that the server is reachable and your credentials are working correctly.",
    parameters: {},
    handler: handleSanityCheck,
  },
  [ToolIDs.SEARCH_JOBS]: {
    description:
      "Search for Jenkins jobs by keyword or pattern. This helps you discover available jobs when you don't know the exact job name. Returns matching jobs with their paths and types.",
    parameters: {
      searchTerm: z
        .string()
        .describe("Keyword or pattern to search for in job names"),
      rawJson: z
        .boolean()
        .optional()
        .describe(
          "Whether to parse the response as JSON (false) or return raw json (true)"
        ),
    },
    handler: handleSearchJobs,
  },
  [ToolIDs.LIST_BUILDS]: {
    description:
      "List all jobs within a specific Jenkins folder and repository structure. Use this to browse the hierarchical organization of your Jenkins jobs. Optionally specify a branch to see branch-specific jobs.",
    parameters: {
      folderName: z
        .string()
        .describe("The Jenkins folder name (top-level organization)"),
      repoName: z
        .string()
        .describe("The repository or project name within the folder"),
      branchName: z
        .string()
        .optional()
        .describe("Optional: specific branch name to list jobs for"),
      rawJson: z
        .boolean()
        .optional()
        .describe(
          "Whether to parse the response as JSON (false) or return raw json (true)"
        ),
    },
    handler: handleListBuilds,
  },
  [ToolIDs.BUILD_WITH_PARAMETERS]: {
    description:
      "Trigger a Jenkins build with custom parameters. This starts a new build job with the specified configuration. Supports environment variables, version numbers, deployment targets, and other custom parameters defined in the job.",
    parameters: {
      folderName: z
        .string()
        .describe("The Jenkins folder name (top-level organization)"),
      repoName: z
        .string()
        .describe("The repository or project name within the folder"),
      branchName: z
        .string()
        .optional()
        .describe("Optional: specific branch name to list jobs for"),
      params: z
        .record(z.string(), z.string())
        .describe("Parameters to pass to the build job"),
      rawJson: z
        .boolean()
        .optional()
        .describe(
          "Whether to parse the response as JSON (false) or return raw json (true)"
        ),
    },
    handler: handleBuildWithParameters,
  },
  [ToolIDs.FETCH_FROM_JENKINS]: {
    description:
      "Retrieve raw data from any Jenkins API endpoint. This is a powerful generic tool for accessing Jenkins data that isn't covered by other specific tools. Useful for custom integrations and advanced Jenkins API usage.",
    parameters: {
      jenkinsUrl: z.string().describe("The Jenkins API URL to fetch from"),
      getJson: z
        .boolean()
        .describe(
          "Whether to parse the response as JSON (false) or return raw json (true)"
        ),
    },
    handler: handleFetchFromJenkins,
  },
  [ToolIDs.INVOKE_REQUEST]: {
    description:
      "Execute any HTTP request to Jenkins with full control over method and parameters. This is the most flexible tool for advanced Jenkins operations like creating jobs, updating configurations, or performing administrative tasks.",
    parameters: {
      jenkinsUrl: z
        .string()
        .describe("The Jenkins API URL to invoke the request on"),
      method: z
        .enum(["GET", "POST", "PUT", "DELETE"])
        .describe("HTTP method to use for the request"),
      params: z
        .record(z.string(), z.string())
        .describe("Parameters to pass to the request"),
      rawJson: z
        .boolean()
        .optional()
        .describe(
          "Whether to parse the response as JSON (false) or return raw json (true)"
        ),
    },
    handler: handleInvokeRequest,
  },
} as const;

export default ToolsConfig;
