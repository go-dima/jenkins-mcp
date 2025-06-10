import axios, { AxiosResponse } from "axios";
import https from "https";
import { authConfig } from "./config.js";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

axios.defaults.httpsAgent = httpsAgent;

export const doFetch = async (
  url: string,
  params?: Record<string, any>
): Promise<AxiosResponse> => {
  return await axios.request({
    ...authConfig,
    url,
    params,
  });
};

export const doRequest = async (
  url: string,
  method: string,
  params?: Record<string, any>
): Promise<AxiosResponse> => {
  return await axios.request({
    ...authConfig,
    url,
    method,
    params,
  });
};

export const fetchJsonData = async (url: string): Promise<AxiosResponse> => {
  // if url already ends with /api/json, use the url as is
  if (url.endsWith("/api/json")) {
    return doFetch(url);
  }
  return doFetch(`${url}/api/json`);
};
