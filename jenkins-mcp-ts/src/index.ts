#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios, { AxiosResponse } from "axios";
import https from "https";
import { encode } from "js-base64";
import { z } from "zod";

// Read jenkins url from env
const { JENKINS_URL, JENKINS_USERNAME, JENKINS_PASSWORD } = process.env;
const authToken64 = encode(`${JENKINS_USERNAME}:${JENKINS_PASSWORD}`);

const authConfig = {
  method: "get" as const,
  headers: {
    Authorization: `Basic ${authToken64}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

axios.defaults.httpsAgent = httpsAgent;

async function doFetch(
  url: string,
  params?: Record<string, any>
): Promise<AxiosResponse> {
  return await axios.request({
    ...authConfig,
    url,
    params,
  });
}

async function doRequest(
  url: string,
  method: string,
  params?: Record<string, any>
): Promise<AxiosResponse> {
  return await axios.request({
    ...authConfig,
    url,
    method,
    params,
  });
}

async function fetchJsonData(url: string): Promise<AxiosResponse> {
  // if url already ends with /api/json, use the url as is
  if (url.endsWith("/api/json")) {
    return doFetch(url);
  }
  return doFetch(`${url}/api/json`);
}

const server = new McpServer({
  name: "jenkins-mcp-server",
  version: "1.0.0",
});

server.tool("sanity-check", {}, async () => {
  try {
    const response = await doFetch(JENKINS_URL!);
    return {
      content: [
        {
          type: "text" as const,
          text: `I'm ${JENKINS_URL}, resposnse: ${JSON.stringify(
            response.status
          )}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: `Error in sanity: ${error}` }],
    };
  }
});

server.tool(
  "search-jobs",
  { searchTerm: z.string() },
  async ({ searchTerm }: { searchTerm: string }) => {
    try {
      const response = await doFetch(`${JENKINS_URL}/search/suggest`, {
        query: searchTerm,
      });
      const data = await response.data;
      return {
        content: [
          { type: "text" as const, text: `Jobs: ${JSON.stringify(data)}` },
        ],
      };
    } catch (error) {
      return {
        content: [
          { type: "text" as const, text: `Error searching jobs: ${error}` },
        ],
      };
    }
  }
);

server.tool(
  "list-jobs",
  "A tool to list repo jobs in a folder. To use this tool, you need to provide the folder name, repo name, and branch name separately.",
  {
    folderName: z.string(),
    repoName: z.string().describe("The name of the job to list"),
    branchName: z
      .string()
      .optional()
      .describe("The name of the branch to list"),
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

      const response = await fetchJsonData(url);
      const data = await response.data;
      return {
        content: [
          { type: "text" as const, text: `Jobs: ${JSON.stringify(data)}` },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing jobs ${url}: ${error}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "build-with-parameters",
  "A tool to build repo jobs in a folder. To use this tool, you need to provide the folder name, repo name, and branch name separately.",
  {
    folderName: z.string(),
    repoName: z.string().describe("The name of the job to build"),
    branchName: z
      .string()
      .optional()
      .describe("The name of the branch to list"),
    params: z
      .record(z.string(), z.string())
      .describe("The params to send request with")
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
    const baseUrl = `${JENKINS_URL}/job/${folderName}/job/${repoName}/`;
    let url = `${baseUrl}`;
    try {
      if (branchName) {
        url = `${url}job/${encodeURIComponent(branchName)}/`;
      }

      const response = await doRequest(
        `${url}buildWithParameters`,
        "POST",
        params
      );
      const data = await response.data;
      return {
        content: [
          { type: "text" as const, text: `Jobs: ${JSON.stringify(data)}` },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error listing jobs ${url}: ${error}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "fetch-from-jenkins",
  "A tool to fetch data from jenkins. To use this tool, you need to provide the full jenkins url and whether to fetch the response as json.",
  {
    jenkinsUrl: z.string().describe("The url to fetch from"),
    json: z.boolean().describe("Whether to fetch the response as json"),
  },
  async ({ jenkinsUrl, json }: { jenkinsUrl: string; json: boolean }) => {
    const fetchAction = json ? fetchJsonData : doFetch;
    try {
      const response = await fetchAction(jenkinsUrl);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(response.data) },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching from ${jenkinsUrl}: ${error}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "invoke-request",
  "A tool to invoke a request to jenkins. To use this tool, you need to provide the full jenkins url, method, and params.",
  {
    jenkinsUrl: z
      .string()
      .describe(
        "The url to send request to, shuold be full path, e.g. https://jenkins.com/job/folder/job/repo/job/branch/buildWithParameters"
      ),
    method: z
      .enum(["GET", "POST", "PUT", "DELETE"])
      .describe("The method to send request with"),
    params: z
      .record(z.string(), z.string())
      .describe("The params to send request with"),
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
      const response = await doRequest(jenkinsUrl, method, params);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(response.data) },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error invoking request ${jenkinsUrl}: ${error}`,
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
