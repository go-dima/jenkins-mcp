# Jenkins MCP Server

A Model Context Protocol (MCP) server that provides seamless integration between Cursor IDE and Jenkins CI/CD systems. This server enables developers to interact with Jenkins directly from their development environment through natural language commands.

## Overview

The Jenkins MCP Server acts as a bridge between Cursor IDE and Jenkins, allowing developers to:

- Search and list Jenkins jobs
- Trigger builds with parameters
- Monitor build status
- Fetch Jenkins data and configurations
- Execute custom Jenkins API requests

## Features

### Available Tools

1. **sanity-check** - Verify connection to Jenkins server
2. **search-jobs** - Search for jobs using keywords
3. **list-builds** - List builds in a specific folder/repository/branch
4. **build-with-parameters** - Trigger parameterized builds
5. **fetch-from-jenkins** - Fetch data from any Jenkins endpoint
6. **invoke-request** - Execute custom HTTP requests to Jenkins API

### Tool Description Extension

You can extend the tools by adding tailored descriptions to the `assets/extraDescriptions.json` file. You'll need to re-build the project to see the changes.

### Security Features

- Basic authentication support
- HTTPS with configurable certificate validation
- Environment variable-based configuration for sensitive data

## Project Structure

```
jenkins-mcp-server/
├── src/                    # source code
│   ├── assets/
│   │   └── extraDescriptions.json  # Custom tool descriptions
│   ├── consts/
│   │   └── toolIds.ts      # Tool identifier constants
│   ├── utils/              # Utility functions
│   ├── handlers.ts         # MCP request handlers
│   ├── index.ts            # Main entry point
│   ├── server.ts           # MCP server setup
│   └── tools.ts            # Tool definitions
```

## Docker

The project includes a multi-stage Dockerfile for containerized deployment. The Docker build process uses:

- **Builder stage**: Compiles TypeScript and installs all dependencies
- **App stage**: Creates a lightweight production image with only runtime dependencies

### Building the Docker Image

```bash
# Build the Docker image
docker build -t jenkins-mcp-server .
```

### Running with Docker

```bash
# Run with environment variables
docker run -d \
  --name jenkins-mcp \
  -e JENKINS_URL="https://your-jenkins-server.com" \
  -e JENKINS_USERNAME="your-username" \
  -e JENKINS_PASSWORD="your-password-or-api-token" \
  jenkins-mcp-server
```

## Prerequisites

- Node.js (version 20 or higher)
- Access to a Jenkins server
- Jenkins username and password/API token

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd jenkins-mcp-server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Tailor usage (optional)

   Add a new tool description to the `assets/extraDescriptions.json` file:

   ```ts
   {
     "search-jobs": {
       "description": "Use this rule when no specific job is mentioned"
     }
   }
   ```

4. Build the project:

```bash
npm run build
```

## Configuration

### Environment Variables

| Variable           | Description                     | Required |
| ------------------ | ------------------------------- | -------- |
| `JENKINS_URL`      | Full URL to your Jenkins server | Yes      |
| `JENKINS_USERNAME` | Jenkins username                | Yes      |
| `JENKINS_PASSWORD` | Jenkins password or API token   | Yes      |

### Adding to Cursor IDE

To use this MCP server with Cursor IDE, you need to configure it in your Cursor settings:

1. **Open Cursor Settings**:

   - Press `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
   - Or go to `Cursor` → `Settings`

2. **Navigate to Features → Beta**:

   - Look for "Model Context Protocol" or "MCP" settings
   - Enable MCP if it's not already enabled

3. **Add the Jenkins MCP Server**:
   Add the following configuration to your MCP settings:

   ```json
   {
     "mcpServers": {
       "jenkins": {
         "command": "node",
         "args": ["/path/to/jenkins-mcp-server/index.js"],
         "env": {
           "JENKINS_URL": "https://your-jenkins-server.com",
           "JENKINS_USERNAME": "your-username",
           "JENKINS_PASSWORD": "your-password-or-api-token"
         }
       }
     }
   }
   ```

   or use the docker image

   ```json
   {
     "mcpServers": {
       "jenkins": {
         "command": "docker",
         "args": [
           "run",
           "-e",
           "JENKINS_URL",
           "-e",
           "JENKINS_USERNAME",
           "-e",
           "JENKINS_PASSWORD",
           "jenkins-mcp-server:latest"
         ],
         "env": {
           "JENKINS_URL": "https://your-jenkins-server.com",
           "JENKINS_USERNAME": "your-username",
           "JENKINS_PASSWORD": "your-password-or-api-token"
         }
       }
     }
   }
   ```

4. **Reload MCP Servers**: After adding the configuration, Reload the config for changes to take effect.

5. **Verify Connection**: Once reloaded, you should see the MCP server in the MCP servers list.

### Example Cursor Configuration File

Your complete Cursor MCP configuration might look like this:

```json
{
  "mcpServers": {
    "jenkins": {
      "command": "node",
      "args": ["/Users/yourname/projects/jenkins-mcp-server/index.js"],
      "env": {
        "JENKINS_URL": "https://jenkins.company.com",
        "JENKINS_USERNAME": "john.doe",
        "JENKINS_PASSWORD": "11234567890abcdef1234567890abcdef12"
      }
    }
  }
}
```

### Security Note for Cursor Configuration

When configuring environment variables in Cursor:

- Consider using Jenkins API tokens instead of passwords
- Ensure your Cursor configuration file has appropriate file permissions
- Never commit configuration files with credentials to version control

## Usage Examples

Once the MCP server is running and connected to Cursor, you can use natural language commands:

- "Check if Jenkins is accessible" → Uses `sanity-check`
- "Search for jobs containing 'frontend'" → Uses `search-jobs`
- "List builds in the mobile-apps folder for the ios-app repository" → Uses `list-builds`
- "Trigger a build for the main branch with environment=staging" → Uses `build-with-parameters`
- "Get the latest build status for project X" → Uses `fetch-from-jenkins`

## API Reference

### Tool Schemas

#### sanity-check

- **Parameters**: None
- **Description**: Verifies connectivity to Jenkins server

#### search-jobs

- **Parameters**:
  - `searchTerm` (string): Keywords to search for
- **Description**: Searches for jobs matching the given term

#### list-builds

- **Parameters**:
  - `folderName` (string): Jenkins folder name
  - `repoName` (string): Repository/job name
  - `branchName` (string, optional): Specific branch name
- **Description**: Lists jobs in the specified hierarchy

#### build-with-parameters

- **Parameters**:
  - `folderName` (string): Jenkins folder name
  - `repoName` (string): Repository/job name
  - `branchName` (string, optional): Branch name
  - `params` (object, optional): Build parameters as key-value pairs
- **Description**: Triggers a parameterized build

#### fetch-from-jenkins

- **Parameters**:
  - `jenkinsUrl` (string): Full Jenkins URL to fetch from
  - `json` (boolean): Whether to parse response as JSON
- **Description**: Fetches data from any Jenkins endpoint

#### invoke-request

- **Parameters**:
  - `jenkinsUrl` (string): Target Jenkins URL
  - `method` (string): HTTP method (GET, POST, PUT, DELETE)
  - `params` (object): Request parameters
- **Description**: Executes custom HTTP requests to Jenkins

## Development

### TypeScript Development

For active development with TypeScript:

```bash
cd jenkins-mcp-ts
npm run dev  # Starts TypeScript compiler in watch mode
```

### Debugging

Use the MCP inspector for debugging:

```bash
cd jenkins-mcp-ts
npm run inspect
```

## Security Considerations

1. **Credentials**: Never commit credentials to version control. Always use environment variables.
2. **HTTPS**: The server disables SSL certificate verification by default. For production, consider enabling proper certificate validation.
3. **API Tokens**: Use Jenkins API tokens instead of passwords when possible.
4. **Network**: Ensure the server runs in a secure network environment.

## Troubleshooting

### Common Issues

1. **Connection Refused**: Verify `JENKINS_URL` is correct and accessible
2. **Authentication Failed**: Check `JENKINS_USERNAME` and `JENKINS_PASSWORD`
3. **SSL Errors**: The server disables SSL verification by default, but network policies might interfere
4. **Permission Denied**: Ensure the Jenkins user has appropriate permissions for the requested operations

### Debug Mode

Set environment variable for verbose logging:

```bash
export DEBUG=jenkins-mcp-server
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review Jenkins server logs
3. Verify MCP server connectivity
4. Open an issue in the repository

## Changelog

### v0.0.1

- Initial release
- Basic Jenkins integration
- Core MCP tools implementation
- TypeScript and JavaScript implementations
