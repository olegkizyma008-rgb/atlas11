# Context7 MCP Server Setup Guide

Context7 is an MCP server that provides up-to-date code documentation for LLMs and AI code editors. It helps with code generation, setup, configuration steps, and library/API documentation.

## Installation

### 1. Get Your API Key (Optional but Recommended)

For higher rate limits and private repository support:
1. Visit [context7.com/dashboard](https://context7.com/dashboard)
2. Create an account and generate an API key
3. Copy your API key

### 2. Configure for Windsurf

The configuration is already set up in `.windsurf/mcp.json`. You just need to add your API key:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]
    }
  }
}
```

**Replace `YOUR_API_KEY` with your actual Context7 API key** (or leave as is for basic usage without rate limits).

### 3. Install Dependencies

```bash
npm install
```

This will install `@upstash/context7-mcp` along with other dependencies.

## Usage

### Automatic Invocation (Recommended)

Add a rule to `.windsurfrules` to automatically invoke Context7:

```
Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.
```

### Manual Invocation

In any prompt, simply type:
```
use context7
```

Then ask your question about code, libraries, or APIs.

## Available Tools

Context7 provides the following tools:

- **resolve_library_id** - Find the correct library identifier
- **get_library_docs** - Retrieve up-to-date documentation for any library
- **search_docs** - Search within library documentation

## Features

- ✅ Up-to-date code documentation
- ✅ Support for multiple programming languages
- ✅ Private repository support (with API key)
- ✅ Higher rate limits (with API key)
- ✅ Automatic library identification

## Troubleshooting

### "Context7 not found" error
- Ensure `npm install` has been run
- Check that `.windsurf/mcp.json` is properly configured
- Restart Windsurf

### Rate limiting
- Get an API key from [context7.com/dashboard](https://context7.com/dashboard)
- Update `.windsurf/mcp.json` with your API key

### Private repository access
- API key is required for private repositories
- Ensure your API key has the necessary permissions

## More Information

- [Context7 GitHub Repository](https://github.com/upstash/context7)
- [Context7 Dashboard](https://context7.com/dashboard)
- [Windsurf MCP Documentation](https://docs.windsurf.com/windsurf/cascade/mcp)

## Configuration Files

- **Project-level config**: `.windsurf/mcp.json` (recommended for team environments)
- **Global config**: `~/.windsurf/mcp.json` (user-specific)

To use global configuration instead of project-level, update your Windsurf settings.
