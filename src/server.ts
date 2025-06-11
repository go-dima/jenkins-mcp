import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import packageJson from "../package.json" with { type: "json" };
import { ToolIDs } from "./consts/toolIds.js";
import getToolConfig from "./tools/tools.helper.js";


const server = new McpServer({
  name: packageJson.name,
  version: packageJson.version
});

for (const toolId of Object.values(ToolIDs)) {
  const { toolDescription, parameters, handler } = getToolConfig(toolId);
  server.tool(toolId, toolDescription, parameters, handler);
}

export default server;
