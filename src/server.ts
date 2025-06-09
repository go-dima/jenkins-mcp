import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { categorizeError, formatError, JenkinsError } from "./errors.js";
import { doFetch, doRequest, fetchJsonData } from "./http.js";

// Read jenkins url from env
const { JENKINS_URL } = process.env;

const server = new McpServer({
  name: "jenkins-mcp-server",
  version: "1.0.0",
});

function formatTextContent(text: string): any {
  return {
    content: [
        {
          type: "text" as const,
      text,
    },
    ],
  };
}

function formatErrorContent(jenkinsError: JenkinsError): any {
  return formatTextContent(formatError(jenkinsError));
}

server.tool(
  "sanity-check",
  "Test connectivity and authentication with your Jenkins server. This verifies that the server is reachable and your credentials are working correctly.",
  {},
  async () => {
    try {
      const { status } = await doFetch(JENKINS_URL!);
      return formatTextContent(
        `✅ **Jenkins Server Status: Healthy**\n\n` +
          `🔗 **Server URL:** ${JENKINS_URL}\n` +
          `📡 **Response Code:** ${status}\n` +
          `🔑 **Authentication:** Working\n\n` +
          `Your Jenkins server is accessible and ready for use!`
      );
  } catch (error) {
      const jenkinsError = categorizeError(error);
      return formatErrorContent(jenkinsError);
  }
  }
);

server.tool(
  "search-jobs",
  "Search for Jenkins jobs by keyword or pattern. This helps you discover available jobs when you don't know the exact job name. Returns matching jobs with their paths and types.",
  {
    searchTerm: z
      .string()
      .describe("Keyword or pattern to search for in job names"),
  },
  async ({ searchTerm }: { searchTerm: string }) => {
    try {
      const { data } = await doFetch(`${JENKINS_URL}/search/suggest`, {
        query: searchTerm,
      });
      return {
        content: [
          { type: "text" as const, text: `Jobs: ${JSON.stringify(data)}` },
        ],
      };
    } catch (error) {
      const jenkinsError = categorizeError(error);
      return formatErrorContent(jenkinsError);
    }
  }
);

server.tool(
  "list-jobs",
  "List all jobs within a specific Jenkins folder and repository structure. Use this to browse the hierarchical organization of your Jenkins jobs. Optionally specify a branch to see branch-specific jobs.",
  {
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
  },
  async ({
    folderName,
    repoName,
    branchName,
  }: {
    folderName: string;
    repoName: string;
    branchName?: string;
  }) => {
    const baseUrl = `${JENKINS_URL}/job/${folderName}/job/${repoName}/`;
    let url = `${baseUrl}`;
    try {
      if (branchName) {
        url = `${url}job/${encodeURIComponent(branchName)}/`;
      }

      const { data } = await fetchJsonData(url);
      return {
        content: [
          { type: "text" as const, text: `Jobs: ${JSON.stringify(data)}` },
        ],
      };
    } catch (error) {
      const jenkinsError = categorizeError(error);
      jenkinsError.suggestions.unshift(
        `Verify the path ${folderName}/${repoName}${
          branchName ? "/" + branchName : ""
        } exists in Jenkins`
      );
      return formatErrorContent(jenkinsError);
    }
  }
);

server.tool(
  "build-with-parameters",
  "Trigger a Jenkins build with custom parameters. This starts a new build job with the specified configuration. Supports environment variables, version numbers, deployment targets, and other custom parameters defined in the job.",
  {
    folderName: z
      .string()
      .describe("The Jenkins folder name containing the job"),
    repoName: z.string().describe("The repository or project name to build"),
    branchName: z
      .string()
      .optional()
      .describe(
        "Optional: specific branch to build (if job supports multiple branches)"
      ),
    params: z
      .record(z.string(), z.string())
      .describe(
        "Build parameters as key-value pairs (e.g., {'ENVIRONMENT': 'staging', 'VERSION': '1.2.3'})"
      )
      .optional(),
  },
  async ({
    folderName,
    repoName,
    branchName,
    params,
  }: {
    folderName: string;
    repoName: string;
    branchName?: string;
    params?: Record<string, string>;
  }) => {
    const baseUrl = `${JENKINS_URL}/job/${folderName}/job/${repoName}`;
    let url = `${baseUrl}`;
    try {
      if (branchName) {
        url = `${url}/job/${encodeURIComponent(branchName)}`;
      }

      const { data, status } = await doRequest(
        `${url}/buildWithParameters`,
        "POST",
        params
      );
      return {
        content: [
          {
            type: "text" as const,
            text: `Status: ${status}, Jobs: ${JSON.stringify(data)}`,
          },
        ],
      };
    } catch (error) {
      const jenkinsError = categorizeError(error);
      const jobPath = branchName
        ? `${folderName}/${repoName}/${branchName}`
        : `${folderName}/${repoName}`;
      jenkinsError.suggestions.unshift(
        `Verify the job ${jobPath} exists and supports parameterized builds`
      );
      if (params && Object.keys(params).length > 0) {
        jenkinsError.suggestions.push(
          `Check if the provided parameters match the job's parameter definitions`
        );
      }
      return formatErrorContent(jenkinsError);
    }
  }
);

server.tool(
  "fetch-from-jenkins",
  "Retrieve raw data from any Jenkins API endpoint. This is a powerful generic tool for accessing Jenkins data that isn't covered by other specific tools. Useful for custom integrations and advanced Jenkins API usage.",
  {
    jenkinsUrl: z
      .string()
      .describe(
        "The complete Jenkins API URL to fetch from (can be relative to Jenkins base URL)"
      ),
    json: z
      .boolean()
      .describe(
        "Whether to parse the response as JSON (true) or return raw text (false)"
      ),
  },
  async ({ jenkinsUrl, json }: { jenkinsUrl: string; json: boolean }) => {
    let url = jenkinsUrl;
    if (!url.startsWith(JENKINS_URL!)) {
      url = `${JENKINS_URL}${url}`;
    }

    const fetchAction = json ? fetchJsonData : doFetch;
    try {
      const { data } = await fetchAction(url);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    } catch (error) {
      const jenkinsError = categorizeError(error);
      jenkinsError.suggestions.unshift(
        `Verify the URL ${jenkinsUrl} is correct and accessible`
      );
      jenkinsError.suggestions.push(
        `Check if the endpoint requires specific permissions`
      );
      return formatErrorContent(jenkinsError);
    }
  }
);

server.tool(
  "invoke-request",
  "Execute any HTTP request to Jenkins with full control over method and parameters. This is the most flexible tool for advanced Jenkins operations like creating jobs, updating configurations, or performing administrative tasks.",
  {
    jenkinsUrl: z
      .string()
      .url()
      .describe(
        "The complete Jenkins URL for the operation (e.g., 'https://jenkins.example.com/job/folder/job/repo/buildWithParameters')"
      ),
    method: z
      .enum(["GET", "POST", "PUT", "DELETE"])
      .describe(
        "HTTP method: GET (retrieve), POST (create/trigger), PUT (update), DELETE (remove)"
      ),
    params: z
      .record(z.string(), z.string())
      .describe(
        "Request parameters as key-value pairs - form data for POST/PUT, query params for GET"
      ),
  },
  async ({
    jenkinsUrl,
    method,
    params,
  }: {
    jenkinsUrl: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    params: Record<string, string>;
  }) => {
    try {
      const { data } = await doRequest(jenkinsUrl, method, params);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    } catch (error) {
      const jenkinsError = categorizeError(error);
      jenkinsError.suggestions.unshift(
        `Verify the URL ${jenkinsUrl} supports ${method} requests`
      );
      jenkinsError.suggestions.push(
        `Check if the operation requires specific Jenkins permissions`
      );
      if (method === "POST" || method === "PUT") {
        jenkinsError.suggestions.push(
          `Ensure required parameters are provided for ${method} operations`
        );
      }
      return formatErrorContent(jenkinsError);
    }
  }
);

export default server;
