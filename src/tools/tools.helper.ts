import {
  extendDescription,
  joinDescription,
} from "../utils/description.helpers.js";
import ToolsConfig from "./tools.js";
import { ToolConfig } from "./tools.types.js";

const getToolConfig = (toolId: keyof typeof ToolsConfig): ToolConfig => {
  const { description, parameters, handler } = ToolsConfig[toolId];
  const joinedDescription = joinDescription(description);
  const extendedDescription = extendDescription(toolId, joinedDescription);
  return { toolDescription: extendedDescription, parameters, handler };
};

export default getToolConfig;
