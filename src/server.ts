import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolIDs } from "./consts/toolIds.js";
import getToolConfig from "./tools/tools.helper.js";

const server = new McpServer({
  name: "jenkins-mcp-server",
  version: "1.2.1",
});

for (const toolId of Object.values(ToolIDs)) {
  const { toolDescription, parameters, handler } = getToolConfig(toolId);
  server.tool(toolId, toolDescription, parameters, handler);
}

export default server;
