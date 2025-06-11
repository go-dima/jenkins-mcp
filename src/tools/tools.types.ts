import { ToolIDs } from "../consts/toolIds.js";

export type ToolDescription = {
  description: string | string[];
  parameters: Record<string, any>;
  handler: (args: any) => Promise<any>;
};

export type ToolDescriptions = {
  [key in (typeof ToolIDs)[keyof typeof ToolIDs]]: ToolDescription;
};

export interface ToolConfig {
  toolDescription: string;
  parameters: any;
  handler: (args: any) => Promise<any>;
}
