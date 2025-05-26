#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import https from "https";
import { encode } from "js-base64";
import { z } from "zod";

// read jenkins url from env
const JENKINS_URL = process.env.JENKINS_URL;
const JENKINS_USERNAME = process.env.JENKINS_USERNAME;
const JENKINS_PASSWORD = process.env.JENKINS_PASSWORD;
const authToken64 = encode(`${JENKINS_USERNAME}:${JENKINS_PASSWORD}`);

const authConfig = {
  method: "get",
  headers: {
    Authorization: `Basic ${authToken64}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

axios.defaults.httpsAgent = httpsAgent;

async function doFetch(url, params) {
  return await axios.request({
    ...authConfig,
    url,
    params,
  });
}

async function doRequest(url, method, params) {
  return await axios.request({
    ...authConfig,
    url,
    method,
    params,
  });
}

async function fetchJsonData(url) {
  // if url already ends with /api/json, use the url as is
  if (url.endsWith("/api/json")) {
    return doFetch(url);
  }
  return doFetch(`${url}/api/json`);
}

const server = new McpServer({
  name: "jenkins-mcp-server",
  version: "0.0.1",
});

server.tool("sanity-check", {}, async () => {
  try {
    const response = await doFetch(JENKINS_URL);
    return {
      content: [
        {
          type: "text",
          text: `I'm ${JENKINS_URL}, resposnse: ${JSON.stringify(
            response.status
          )}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error in sanity: ${error}` }],
    };
  }
});

server.tool(
  "search-jobs",
  { searchTerm: z.string() },
  async ({ searchTerm }) => {
    try {
      const response = await doFetch(`${JENKINS_URL}/search/suggest`, {
        query: searchTerm,
      });
      const data = await response.data;
      return {
        content: [{ type: "text", text: `Jobs: ${JSON.stringify(data)}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error searching jobs: ${error}` }],
      };
    }
  }
);

server.tool(
  "list-jobs",
  {
    folderName: z.string(),
    repoName: z.string().describe("The name of the job to list"),
    branchName: z
      .string()
      .optional()
      .describe("The name of the branch to list"),
  },
  async ({ folderName, repoName, branchName }) => {
    const baseUrl = `${JENKINS_URL}/job/${folderName}/job/${repoName}/`;
    let url = `${baseUrl}`;
    try {
      if (branchName) {
        url = `${url}job/${encodeURIComponent(branchName)}/`;
      }

      const response = await fetchJsonData(url);
      const data = await response.data;
      return {
        content: [{ type: "text", text: `Jobs: ${JSON.stringify(data)}` }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error listing jobs ${url}: ${error}` },
        ],
      };
    }
  },
  {
    description:
      "A tool to list repo jobs in a folder. To use this tool, you need to provide the folder name, repo name, and branch name separately.",
  }
);

server.tool(
  "build-with-parameters",
  {
    folderName: z.string(),
    repoName: z.string().describe("The name of the job to build"),
    branchName: z
      .string()
      .optional()
      .default({})
      .describe("The name of the branch to list"),
    params: z
      .record(z.string(), z.string())
      .describe("The params to send request with")
      .optional(),
  },
  async ({ folderName, repoName, branchName, params }) => {
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
        content: [{ type: "text", text: `Jobs: ${JSON.stringify(data)}` }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error listing jobs ${url}: ${error}` },
        ],
      };
    }
  },
  {
    description:
      "A tool to list repo jobs in a folder. To use this tool, you need to provide the folder name, repo name, and branch name separately.",
  }
);

server.tool(
  "fetch-from-jenkins",
  {
    jenkinsUrl: z.string().describe("The url to fetch from"),
    json: z.boolean().describe("Whether to fetch the response as json"),
  },
  async ({ jenkinsUrl, json }) => {
    const fetchAction = json ? fetchJsonData : doFetch;
    try {
      const response = await fetchAction(jenkinsUrl);
      return {
        content: [{ type: "text", text: JSON.stringify(response.data) }],
      };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `Error fetching from ${jenkinsUrl}: ${error}` },
        ],
      };
    }
  },
  {
    description:
      "A tool to fetch data from jenkins. To use this tool, you need to provide the full jenkins url and whether to fetch the response as json.",
  }
);

server.tool(
  "invoke-request",
  {
    jenkinsUrl: z.string().describe("The url to send request to"),
    method: z
      .enum(["GET", "POST", "PUT", "DELETE"])
      .describe("The method to send request with"),
    params: z
      .record(z.string(), z.string())
      .describe("The params to send request with"),
  },
  async ({ jenkinsUrl, method, params }) => {
    try {
      const response = await doRequest(jenkinsUrl, method, params);
      return {
        content: [{ type: "text", text: JSON.stringify(response.data) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error invoking request ${jenkinsUrl}: ${error}`,
          },
        ],
      };
    }
  },
  {
    description:
      "A tool to invoke a request to jenkins. To use this tool, you need to provide the full jenkins url, method, and params.",
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
