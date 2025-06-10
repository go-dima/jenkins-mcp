// Enhanced error handling utility
export interface JenkinsError {
  type:
    | "CONNECTION"
    | "AUTHENTICATION"
    | "NOT_FOUND"
    | "PERMISSION"
    | "INVALID_PARAMS"
    | "UNKNOWN";
  message: string;
  suggestions: string[];
  originalError?: any;
}

export const categorizeError = (error: any): JenkinsError => {
  const errorStr = error.toString().toLowerCase();

  if (
    error.code === "ECONNREFUSED" ||
    errorStr.includes("connect econnrefused")
  ) {
    return {
      type: "CONNECTION",
      message: "Cannot connect to Jenkins server",
      suggestions: [
        "Verify JENKINS_URL environment variable is correct",
        "Check if Jenkins server is running",
        "Confirm network connectivity to Jenkins server",
        "Check if firewall is blocking the connection",
      ],
      originalError: error,
    };
  }

  if (error.response?.status === 401 || errorStr.includes("unauthorized")) {
    return {
      type: "AUTHENTICATION",
      message: "Authentication failed",
      suggestions: [
        "Verify JENKINS_USERNAME and JENKINS_PASSWORD environment variables",
        "Check if the Jenkins user account is active",
        "Ensure the user has necessary permissions",
        "Try generating a new API token if using token-based auth",
      ],
      originalError: error,
    };
  }

  if (error.response?.status === 404 || errorStr.includes("not found")) {
    return {
      type: "NOT_FOUND",
      message: "Jenkins job or resource not found",
      suggestions: [
        "Verify the folder name, repository name, and branch name are correct",
        "Check if the job exists in Jenkins",
        "Ensure proper case sensitivity in job names",
        "Use the search-jobs tool to find available jobs",
      ],
      originalError: error,
    };
  }

  if (error.response?.status === 403 || errorStr.includes("forbidden")) {
    return {
      type: "PERMISSION",
      message: "Insufficient permissions",
      suggestions: [
        "Check if the user has permission to access this job",
        "Verify build permissions for this project",
        "Contact Jenkins admin to grant necessary permissions",
        "Ensure the user is in the correct Jenkins groups",
      ],
      originalError: error,
    };
  }

  if (errorStr.includes("invalid") || errorStr.includes("bad request")) {
    return {
      type: "INVALID_PARAMS",
      message: "Invalid parameters provided",
      suggestions: [
        "Check parameter names and values",
        "Verify required parameters are provided",
        "Ensure parameter values match expected formats",
        "Use get-job-parameters tool to see available parameters",
      ],
      originalError: error,
    };
  }

  return {
    type: "UNKNOWN",
    message: "An unexpected error occurred",
    suggestions: [
      "Check Jenkins server logs for more details",
      "Verify Jenkins server is functioning properly",
      "Try the sanity-check tool to test basic connectivity",
      "Contact Jenkins administrator if the issue persists",
    ],
    originalError: error,
  };
};

export const formatError = (jenkinsError: JenkinsError): string => {
  const errorType = jenkinsError.type.replace("_", " ").toLowerCase();
  let output = `❌ **${jenkinsError.message}** (${errorType} error)\n\n`;

  output += "💡 **Suggestions to resolve this issue:**\n";
  jenkinsError.suggestions.forEach((suggestion, index) => {
    output += `${index + 1}. ${suggestion}\n`;
  });

  if (jenkinsError.originalError && process.env.NODE_ENV === "development") {
    output += `\n🔍 **Technical details:** ${
      jenkinsError.originalError.message || jenkinsError.originalError
    }`;
  }

  return output;
};
