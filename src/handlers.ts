import { categorizeError } from "./utils/errors.js";
import {
  formatErrorContent,
  formatJsonContent,
  formatTextContent,
} from "./utils/format.js";
import { doFetch, doRequest, fetchJsonData } from "./utils/http.js";

// Read jenkins url from env
const { JENKINS_URL } = process.env;

export const handleSanityCheck = async () => {
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
};

export const handleSearchJobs = async ({
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
};

export const handleListJobs = async ({
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
};

export const handleBuildWithParameters = async ({
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
};

export const handleFetchFromJenkins = async ({
  jenkinsUrl,
  getJson,
}: {
  jenkinsUrl: string;
  getJson: boolean;
}) => {
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
};

export const handleInvokeRequest = async ({
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
};
