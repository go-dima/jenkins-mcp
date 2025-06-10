import { formatError, JenkinsError } from "./errors.js";

export const formatTextContent = (text: string): any => {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
};

export const formatErrorContent = (jenkinsError: JenkinsError): any => {
  return formatTextContent(formatError(jenkinsError));
};

export const formatJsonContent = (json: any): any => {
  return formatTextContent(JSON.stringify(json, null, 2));
};
