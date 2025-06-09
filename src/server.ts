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

function formatJsonContent(json: any): any {
  return formatTextContent(JSON.stringify(json, null, 2));
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
    rawJson: z
      .boolean()
      .optional()
      .describe(
        "Whether to parse the response as JSON (false) or return raw json (true)"
      ),
  },
  async ({
    searchTerm,
    rawJson,
  }: {
    searchTerm: string;
    rawJson?: boolean;
  }) => {
    try {
      const { data } = await doFetch(`${JENKINS_URL}/search/suggest`, {
        query: searchTerm,
      });

      if (!data.suggestions || data.suggestions.length === 0) {
        return formatTextContent(
          `🔍 **No jobs found matching "${searchTerm}"**\n\n` +
            `💡 **Try:**\n` +
            `• Using partial job names or keywords\n` +
            `• Checking spelling and case sensitivity\n` +
            `• Using broader search terms\n` +
            `• Contact your Jenkins admin to verify job availability`
        );
      }

      if (rawJson) {
        return formatJsonContent(data);
      }

      let output = `🔍 **Found ${data.suggestions.length} jobs matching "${searchTerm}":**\n\n`;

      data.suggestions.forEach((job: any, index: number) => {
        const statusIcon = job.icon
          ? job.icon.includes("blue")
            ? "✅"
            : job.icon.includes("red")
            ? "❌"
            : "⚪"
          : "📋";
        output += `${index + 1}. ${statusIcon} **${job.name}**\n`;
        output += `   📍 ${job.url}\n`;
        if (job.type) output += `   🏷️  Type: ${job.type}\n`;
        output += "\n";
      });

      return formatTextContent(output);
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
    rawJson: z
      .boolean()
      .optional()
      .describe(
        "Whether to parse the response as JSON (false) or return raw json (true)"
      ),
  },
  async ({
    folderName,
    repoName,
    branchName,
    rawJson,
  }: {
    folderName: string;
    repoName: string;
    branchName?: string;
    rawJson?: boolean;
  }) => {
    const baseUrl = `${JENKINS_URL}/job/${folderName}/job/${repoName}/`;
    let url = `${baseUrl}`;
    try {
      if (branchName) {
        url = `${url}job/${encodeURIComponent(branchName)}/`;
      }

      const { data } = await fetchJsonData(url);

      if (!data.jobs || data.jobs.length === 0) {
        const location = branchName
          ? `${folderName}/${repoName}/${branchName}`
          : `${folderName}/${repoName}`;

        return formatTextContent(
          `📂 **No jobs found in ${location}**\n\n` +
            `💡 **This could mean:**\n` +
            `• The folder/repo/branch path doesn't exist\n` +
            `• No jobs are configured in this location\n` +
            `• You may not have permission to view jobs here\n\n` +
            `🔍 **Try using search-jobs to find available jobs**`
        );
      }

      if (rawJson) {
        return formatJsonContent(data);
      }

      const location = branchName
        ? `${folderName}/${repoName}/${branchName}`
        : `${folderName}/${repoName}`;
      let output = `📂 **Jobs in ${location}** (${data.jobs.length} found):\n\n`;

      data.jobs.forEach((job: any, index: number) => {
        const statusIcon = job.color
          ? job.color.includes("blue")
            ? "✅"
            : job.color.includes("red")
            ? "❌"
            : job.color.includes("yellow")
            ? "⚠️"
            : "⚪"
          : "📋";

        output += `${index + 1}. ${statusIcon} **${job.name}**\n`;
        output += `   🔗 ${job.url}\n`;
        if (job.description) output += `   📝 ${job.description}\n`;
        if (job.lastBuild) {
          output += `   🏗️  Last Build: #${job.lastBuild.number} (${new Date(
            job.lastBuild.timestamp
          ).toLocaleString()})\n`;
        }
        output += "\n";
      });

      return formatTextContent(output);
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
    rawJson: z
      .boolean()
      .optional()
      .describe(
        "Whether to parse the response as JSON (false) or return raw json (true)"
      ),
  },
  async ({
    folderName,
    repoName,
    branchName,
    params,
    rawJson,
  }: {
    folderName: string;
    repoName: string;
    branchName?: string;
    params?: Record<string, string>;
    rawJson?: boolean;
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

      if (rawJson) {
        return formatJsonContent(data);
      }

      const jobPath = branchName
        ? `${folderName}/${repoName}/${branchName}`
        : `${folderName}/${repoName}`;
      let output = `🚀 **Build Triggered Successfully!**\n\n`;
      output += `📂 **Job:** ${jobPath}\n`;
      output += `📡 **Status Code:** ${status}\n`;

      if (params && Object.keys(params).length > 0) {
        output += `⚙️  **Parameters:**\n`;
        Object.entries(params).forEach(([key, value]) => {
          output += `   • ${key}: ${value}\n`;
        });
      }

      output += `\n💡 **Next Steps:**\n`;
      output += `• Check Jenkins UI for build progress\n`;
      output += `• Monitor build logs for any issues\n`;
      output += `• Build will appear in the job's build history\n`;

      return formatTextContent(output);
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
    getJson: z
      .boolean()
      .describe(
        "Whether to parse the response as JSON (true) or return raw text (false)"
      ),
  },
  async ({ jenkinsUrl, getJson }: { jenkinsUrl: string; getJson: boolean }) => {
    let url = jenkinsUrl;
    if (!url.startsWith(JENKINS_URL!)) {
      url = `${JENKINS_URL}${url}`;
    }

    const fetchAction = getJson ? fetchJsonData : doFetch;
    try {
      const { data } = await fetchAction(url);

      let output = `📊 **Data Retrieved Successfully**\n\n`;
      output += `🔗 **URL:** ${jenkinsUrl}\n`;
      output += `📄 **Format:** ${getJson ? "JSON" : "Raw"}\n\n`;
      output += `📋 **Response:**\n`;

      if (getJson && typeof data === "object") {
        output += "```json\n" + JSON.stringify(data, null, 2) + "\n```";
      } else {
        output += "```\n" + JSON.stringify(data) + "\n```";
      }

      return formatTextContent(output);
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
    rawJson: z
      .boolean()
      .optional()
      .describe(
        "Whether to parse the response as JSON (false) or return raw json (true)"
      ),
  },
  async ({
    jenkinsUrl,
    method,
    params,
    rawJson,
  }: {
    jenkinsUrl: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    params: Record<string, string>;
    rawJson?: boolean;
  }) => {
    try {
      const { data, status } = await doRequest(jenkinsUrl, method, params);

      if (rawJson) {
        return formatJsonContent(data);
      }

      let output = `🔧 **Request Executed Successfully**\n\n`;
      output += `🔗 **URL:** ${jenkinsUrl}\n`;
      output += `📡 **Method:** ${method}\n`;
      output += `📊 **Status:** ${status}\n`;

      if (params && Object.keys(params).length > 0) {
        output += `⚙️  **Parameters:**\n`;
        Object.entries(params).forEach(([key, value]) => {
          output += `   • ${key}: ${value}\n`;
        });
      }

      output += `\n📋 **Response:**\n`;
      output += "```json\n" + JSON.stringify(data, null, 2) + "\n```";

      return formatTextContent(output);
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
