import { HealthEndpoint } from "../interfaces/endpoints/health";
import { ModelsEndpoint } from "../interfaces/endpoints/models";
import { BaseModel } from "../models/baseModel";
import { RouterModel } from "../models/routerModel";
import { SingleModel } from "../models/singleModel";
import { resolveApiKey, resolveUrl } from "./resolver";

/**
 * Detects if the server is ready
 * @returns True if it's ready to work
 */
export const isServerReady = async (): Promise<boolean> => {
  try {
    const { status } = await rpc<HealthEndpoint>("/health");
    return status === "ok";
  } catch {
    return false;
  }
};

/**
 * Makes an HTTP request to the llama-server and returns the parsed JSON response
 *
 * @param endpoint The endpoint path to fetch (e.g. "/health")
 * @param body The optional request body for POST requests
 * @returns The parsed JSON response from the server
 */
export const rpc = async <T>(
  endpoint: string,
  body?: Record<string, unknown>,
): Promise<T> => {
  const base = await resolveUrl(process.cwd());
  const url = `${base}${endpoint}`;

  const data = {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  };

  const apiKey = await resolveApiKey();
  const res = await fetch(url, {
    ...data,
    headers: {
      ...data.headers,
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  });

  const response: T = await res.json();
  return response;
};

/**
 * Retrieves a list of available models from llama-server
 * @param base Base URL to use
 * @returns The list of models
 */
export const listModels = async (): Promise<BaseModel[]> => {
  const { models, data } = await rpc<ModelsEndpoint>("/models");

  if (models) {
    return data.map((m) => new SingleModel(m));
  }

  const response = data
    .map((m) => new RouterModel(m))
    .sort((a, b) => (a.id > b.id ? 1 : a.id === b.id ? 0 : -1));

  return response;
};
