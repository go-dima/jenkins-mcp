import { formatError, JenkinsError } from "./errors.js";

export function formatTextContent(text: string): any {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

export function formatErrorContent(jenkinsError: JenkinsError): any {
  return formatTextContent(formatError(jenkinsError));
}

export function formatJsonContent(json: any): any {
  return formatTextContent(JSON.stringify(json, null, 2));
}
