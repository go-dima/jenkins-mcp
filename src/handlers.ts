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

export const handleListBuilds = async ({
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
      url = `${url}job/${encodeURIComponent(branchName)}`;
    }

    const { data } = await fetchJsonData(url);

    if (!data.builds || data.builds.length === 0) {
      const location = branchName
        ? `${folderName}/${repoName}/${branchName}`
        : `${folderName}/${repoName}`;

      return formatTextContent(
        `📂 **No jobs found in ${location} for ${url}**\n\n` +
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
    let output = `📂 **Builds in ${location}** (${data.builds.length} found):\n\n`;

    data.builds.forEach((build: any, index: number) => {
      const statusIcon = build.color
        ? build.color.includes("blue")
          ? "✅"
          : build.color.includes("red")
          ? "❌"
          : build.color.includes("yellow")
          ? "⚠️"
          : "⚪"
        : "📋";

      output += `${index + 1}. ${statusIcon} **${build.number}**\n`;
      output += `   🔗 ${build.url}\n`;
      if (build.description) output += `   📝 ${build.description}\n`;
      if (build.lastBuild) {
        output += `   🏗️  Last Build: #${build.lastBuild.number} (${new Date(
          build.lastBuild.timestamp
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

export const handleGetJobInfo = async ({
  fullname,
  rawJson,
}: {
  fullname: string;
  rawJson?: boolean;
}) => {
  try {
    // Construct the API URL exactly like the working curl command
    // Split the fullname by '/' and encode each part properly
    const jobParts = fullname
      .split("/")
      .map((part) => encodeURIComponent(part))
      .filter(Boolean); // Remove empty parts

    // Build the complete API URL with /api/json and depth parameter
    const apiUrl = `${JENKINS_URL}/job/${jobParts.join(
      "/job/"
    )}/api/json?depth=1`;

    // Use doFetch directly since we're constructing the complete API URL
    const { data } = await doFetch(apiUrl);

    // Check if we got valid job data
    if (!data || !data.name) {
      return formatTextContent(
        `📂 **Job not found: ${fullname}**\n\n` +
          `💡 **This could mean:**\n` +
          `• The job path doesn't exist\n` +
          `• You may not have permission to view this job\n` +
          `• The job name format is incorrect\n\n` +
          `🔍 **Try using search-jobs to find available jobs**\n` +
          `🌐 **Attempted URL:** ${apiUrl}`
      );
    }

    if (rawJson) {
      return formatJsonContent(data);
    }

    // Format the job information in a readable way
    let output = `📋 **Job Information: ${fullname}**\n\n`;

    // Basic job info
    output += `🏷️  **Name:** ${data.name}\n`;
    output += `🔗 **URL:** ${data.url}\n`;
    output += `📂 **Full Name:** ${data.fullName || fullname}\n`;

    if (data.description) {
      output += `📝 **Description:** ${data.description}\n`;
    }

    // Job status and health
    if (data.color) {
      const statusIcon = data.color.includes("blue")
        ? "✅"
        : data.color.includes("red")
        ? "❌"
        : data.color.includes("yellow")
        ? "⚠️"
        : data.color.includes("grey")
        ? "⚫"
        : "⚪";
      output += `🎯 **Status:** ${statusIcon} ${data.color}\n`;
    }

    if (data.buildable !== undefined) {
      output += `🔨 **Buildable:** ${data.buildable ? "Yes" : "No"}\n`;
    }

    // Build information
    if (data.lastBuild) {
      output += `\n🏗️  **Last Build:**\n`;
      output += `   • Number: #${data.lastBuild.number}\n`;
      output += `   • URL: ${data.lastBuild.url}\n`;
    }

    if (data.lastSuccessfulBuild) {
      output += `\n✅ **Last Successful Build:**\n`;
      output += `   • Number: #${data.lastSuccessfulBuild.number}\n`;
      output += `   • URL: ${data.lastSuccessfulBuild.url}\n`;
    }

    if (data.lastFailedBuild) {
      output += `\n❌ **Last Failed Build:**\n`;
      output += `   • Number: #${data.lastFailedBuild.number}\n`;
      output += `   • URL: ${data.lastFailedBuild.url}\n`;
    }

    // Recent builds
    if (data.builds && data.builds.length > 0) {
      output += `\n📊 **Recent Builds** (${data.builds.length} shown):\n`;
      data.builds.slice(0, 5).forEach((build: any, index: number) => {
        output += `   ${index + 1}. #${build.number} - ${build.url}\n`;
      });
      if (data.builds.length > 5) {
        output += `   ... and ${data.builds.length - 5} more builds\n`;
      }
    }

    // Job configuration details
    if (data.property && data.property.length > 0) {
      output += `\n⚙️  **Properties:** ${data.property.length} configured\n`;
    }

    // Downstream and upstream projects
    if (data.downstreamProjects && data.downstreamProjects.length > 0) {
      output += `\n⬇️  **Downstream Projects:**\n`;
      data.downstreamProjects.forEach((project: any) => {
        output += `   • ${project.name} (${project.url})\n`;
      });
    }

    if (data.upstreamProjects && data.upstreamProjects.length > 0) {
      output += `\n⬆️  **Upstream Projects:**\n`;
      data.upstreamProjects.forEach((project: any) => {
        output += `   • ${project.name} (${project.url})\n`;
      });
    }

    // Health reports
    if (data.healthReport && data.healthReport.length > 0) {
      output += `\n🏥 **Health Reports:**\n`;
      data.healthReport.forEach((report: any) => {
        const healthIcon =
          report.score >= 80
            ? "💚"
            : report.score >= 60
            ? "💛"
            : report.score >= 40
            ? "🧡"
            : "❤️";
        output += `   ${healthIcon} ${report.description} (Score: ${report.score}%)\n`;
      });
    }

    // Actions (like parameterized builds)
    if (data.actions && data.actions.length > 0) {
      const parameterActions = data.actions.filter(
        (action: any) =>
          action._class &&
          action._class.includes("ParametersDefinitionProperty")
      );

      if (parameterActions.length > 0) {
        output += `\n🔧 **Build Parameters:**\n`;
        parameterActions.forEach((action: any) => {
          if (action.parameterDefinitions) {
            action.parameterDefinitions.forEach((param: any) => {
              output += `   • ${param.name}: ${param.type || "String"}`;
              if (param.defaultParameterValue) {
                output += ` (default: ${param.defaultParameterValue.value})`;
              }
              output += `\n`;
              if (param.description) {
                output += `     ${param.description}\n`;
              }
            });
          }
        });
      }
    }

    return formatTextContent(output);
  } catch (error) {
    const jenkinsError = categorizeError(error);

    // Enhanced error suggestions based on common Jenkins API issues
    const jobParts = fullname.split("/").filter(Boolean);
    const constructedUrl = `${JENKINS_URL}/job/${jobParts
      .map((part) => encodeURIComponent(part))
      .join("/job/")}/api/json?depth=1`;

    jenkinsError.suggestions.unshift(
      `Verify the job path '${fullname}' exists in Jenkins`,
      `Check if you have permission to view this job`,
      `Ensure the job name format is correct (use / to separate folder levels)`,
      `Constructed URL: ${constructedUrl}`,
      `Try using the search-jobs tool first to find the correct job path`
    );

    // Add specific suggestions for encoded URLs with spaces
    if (fullname.includes(" ")) {
      jenkinsError.suggestions.push(
        `Job name contains spaces - URL encoding is applied automatically`,
        `Try searching for the job first to get the exact path`
      );
    }

    return formatErrorContent(jenkinsError);
  }
};

export const handleGetJobLogs = async ({
  fullname,
  buildNumber,
  ntail,
}: {
  fullname: string;
  buildNumber: string;
  ntail?: number;
}) => {
  try {
    // Split the fullname by '/' and encode each part properly
    const jobParts = fullname
      .split("/")
      .map((part) => encodeURIComponent(part))
      .filter(Boolean); // Remove empty parts

    // Build the console log URL path (without JENKINS_URL first)
    const logPath = `/job/${jobParts.join("/job/")}/${buildNumber}/consoleText`;

    // Use the same approach as handleFetchFromJenkins
    let url = logPath;
    if (!url.startsWith(JENKINS_URL!)) {
      url = `${JENKINS_URL}${url}`;
    }

    const { data } = await doFetch(url);

    // Apply ntail to the actual log data (lines, not characters)
    let logData = data;
    if (ntail && typeof data === "string") {
      const lines = data.split("\n");
      logData = lines.slice(-ntail).join("\n");
    }

    let output = `📜 **Console Log for ${fullname} #${buildNumber}**`;
    if (ntail) {
      output += ` (last ${ntail} lines)`;
    }
    output += `\n\n`;
    output += "```\n" + logData + "\n```";

    return formatTextContent(output);
  } catch (error) {
    const jenkinsError = categorizeError(error);

    // Enhanced error suggestions based on common Jenkins API issues
    const jobParts = fullname.split("/").filter(Boolean);
    const logPath = `/job/${jobParts
      .map((part) => encodeURIComponent(part))
      .join("/job/")}/${buildNumber}/consoleText`;
    const constructedUrl = `${JENKINS_URL}${logPath}`;

    jenkinsError.suggestions.unshift(
      `Verify the job '${fullname}' and build number '${buildNumber}' exist in Jenkins`,
      `Verify the folder name, repository name, and branch name are correct`,
      `Check if the job exists in Jenkins`,
      `Ensure proper case sensitivity in job names`,
      `Use the search-jobs tool to find available jobs`,
      `Attempted path: ${logPath}`,
      `Constructed URL: ${constructedUrl}`
    );

    return formatErrorContent(jenkinsError);
  }
};
