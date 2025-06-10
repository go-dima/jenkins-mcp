import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolIDs } from "./consts/toolIds.js";
import ToolsConfig from "./tools.js";
import { extendDescription } from "./utils/tools.js";

const server = new McpServer({
  name: "jenkins-mcp-server",
  version: "1.2.0",
});

for (const toolId of Object.values(ToolIDs)) {
  const { description, parameters, handler } = ToolsConfig[toolId];
  const extendedDescription = extendDescription(toolId, description);
  server.tool(toolId, extendedDescription, parameters, handler);
}

export default server;
