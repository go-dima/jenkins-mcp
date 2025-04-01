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

async function fetchJsonData(url) {
  return doFetch(`${url}api/json`);
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
  { jobName: z.string(), branchName: z.string().optional() },
  async ({ jobName, branchName }) => {
    const baseUrl = `${JENKINS_URL}/job/Kosmos/job/${jobName}/`;
    let url = `${baseUrl}`;
    try {
      if (branchName) {
        url = `${url}/job/${branchName}/`;
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
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
