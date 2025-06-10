import { encode } from "js-base64";

const { JENKINS_USERNAME, JENKINS_PASSWORD } = process.env;
const authToken64 = encode(`${JENKINS_USERNAME}:${JENKINS_PASSWORD}`);

const authConfig = {
  method: "get" as const,
  headers: {
    Authorization: `Basic ${authToken64}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
};

export { authConfig };
