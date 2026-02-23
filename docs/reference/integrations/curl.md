[Home](../../index.md) > [Reference](../index.md) > [Integrations](index.md) > **cURL Examples**

# cURL Examples

Code examples for using the KnowStack MCP endpoint with cURL.

## MCP Query

```bash
curl -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "x-ks-org: my-org" \
  -H "x-ks-project: api-docs" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "knowstack.query",
      "arguments": { "query": "How do I get started?" }
    }
  }'
```

## List Tools

```bash
curl -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "x-ks-org: my-org" \
  -H "x-ks-project: api-docs" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Pretty Print with jq

```bash
curl -s -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "x-ks-org: my-org" \
  -H "x-ks-project: api-docs" \
  -d '{
    "jsonrpc":"2.0","id":1,"method":"tools/call",
    "params":{"name":"knowstack.query","arguments":{"query":"What is KnowStack?"}}
  }' | jq
```

## Using Environment Variables

```bash
export KS_ORG="my-org"
export KS_PROJECT="api-docs"
export KS_URL="http://localhost:3000/api/v1/mcp"

curl -s -X POST "$KS_URL" \
  -H "Content-Type: application/json" \
  -H "x-ks-org: $KS_ORG" \
  -H "x-ks-project: $KS_PROJECT" \
  -d '{
    "jsonrpc":"2.0","id":1,"method":"tools/call",
    "params":{"name":"knowstack.query","arguments":{"query":"How do I get started?"}}
  }' | jq
```

## Search Documents

```bash
curl -s -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "x-ks-org: my-org" \
  -H "x-ks-project: api-docs" \
  -d '{
    "jsonrpc":"2.0","id":1,"method":"tools/call",
    "params":{"name":"knowstack.search_documents","arguments":{"q":"architecture"}}
  }' | jq
```

## Shell Script

```bash
#!/bin/bash
# query.sh - Query KnowStack from command line

KS_ORG="${KS_ORG:-}"
KS_PROJECT="${KS_PROJECT:-}"
KS_URL="${KS_URL:-http://localhost:3000/api/v1/mcp}"

if [ -z "$KS_ORG" ] || [ -z "$KS_PROJECT" ]; then
  echo "Error: KS_ORG and KS_PROJECT must be set"
  exit 1
fi

if [ -z "$1" ]; then
  echo "Usage: ./query.sh \"Your question here\""
  exit 1
fi

curl -s -X POST "$KS_URL" \
  -H "Content-Type: application/json" \
  -H "x-ks-org: $KS_ORG" \
  -H "x-ks-project: $KS_PROJECT" \
  -d "{
    \"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",
    \"params\":{\"name\":\"knowstack.query\",\"arguments\":{\"query\":\"$1\"}}
  }" | jq '.result.content[0].text'
```

Usage:

```bash
chmod +x query.sh
export KS_ORG="my-org"
export KS_PROJECT="api-docs"
./query.sh "How do I get started?"
```

## See Also

- [JavaScript Examples](javascript.md)
- [MCP Reference](../api/mcp.md)
- [Error Codes](../troubleshooting/errors.md)
