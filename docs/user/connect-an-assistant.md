# Connect an assistant

Grocy Next has an MCP server. MCP (Model Context Protocol) is an open
standard that lets an AI assistant call tools on a server. With the MCP
server, your assistant reads the review queue, puts the lines of a receipt
into it, and accepts a pending scan when you ask.

The MCP server is off until you set a token. The token is one fixed secret
that the assistant sends with each request. The server refuses a request
with no token or with a wrong token.

## Make the token

Make a random token with this command:

```sh
openssl rand -hex 32
```

The command writes 64 characters. The server refuses a token of less than 32
characters, and the process stops at start with a message that names
`MCP_TOKEN`.

Keep the token secret. Each person who has the token can change your Grocy
stock through the assistant.

## Set the token

Set the token in the variable `MCP_TOKEN`. When the variable is empty or not
set, the MCP server is off. The startup log then says that the MCP server is
off.

### Docker Compose and Portainer

The files `compose.yaml` and `compose.postgres.yaml` read `MCP_TOKEN`. Set
it in the shell, in a `.env` file next to the Compose file, or in the stack
environment of Portainer:

```sh
MCP_TOKEN=paste-your-token-here
```

Then start the stack again:

```sh
docker compose up -d
```

### Kubernetes

The Kubernetes example reads `MCP_TOKEN` from an optional Secret with the
name `grocy-next-mcp`. Create the Secret in the namespace of Grocy Next:

```sh
kubectl create secret generic grocy-next-mcp \
  --from-literal=MCP_TOKEN=paste-your-token-here
```

The pod reads the Secret only at start. Restart the pod after you create
the Secret:

```sh
kubectl rollout restart deployment/grocy-next
```

When the Secret does not exist, the pod starts and the MCP server is off.

## The address of the endpoint

The MCP endpoint is at the path `/api/v2/mcp` of your deployment. When
Grocy Next is at `https://grocy-next.example.com`, the endpoint is:

```text
https://grocy-next.example.com/api/v2/mcp
```

The endpoint uses the Streamable HTTP transport of MCP. An assistant on
another computer must reach the endpoint over HTTPS. The Ingress or the
reverse proxy of your deployment gives the HTTPS address.

The assistant sends the token in this header on each request:

```text
Authorization: Bearer paste-your-token-here
```

## Claude Code

Run this command in a terminal. Use your own address and your own token:

```sh
claude mcp add --transport http grocy-next https://grocy-next.example.com/api/v2/mcp \
  --header "Authorization: Bearer paste-your-token-here"
```

`grocy-next` is the name of the server in Claude Code. The command adds the
server to the current project only. To add it to all your projects, add
`--scope user`.

## claude.ai and Claude Desktop

Add the custom connector on claude.ai. Claude Desktop uses the connectors of
your Claude account, so the connector also shows in Claude Desktop.

Claude connects to the MCP server from the cloud of Anthropic, not from your
computer. This is also true for Claude Desktop. The MCP server must be
reachable from the public internet. A server that only your home network or
a VPN reaches does not connect.

On a Free, Pro, Max, or Ultra plan:

1. Go to `Customize > Connectors`.
2. Select `Add`, then `Add custom connector`.
3. Enter a name, for example `Grocy Next`, and the address of the endpoint.
   Click `Continue`.
4. Under `Authentication`, select `No sign-in`.
5. Open `Request headers`. Select the header name `authorization`.
6. Enter the value `Bearer paste-your-token-here`. Type the word `Bearer`
   and a space before the token. Claude sends the value as you type it.
7. Click `Add`.

On a Team or Enterprise plan, an owner adds the connector in
`Organization settings > Connectors`. Then each member clicks `Connect` in
`Customize > Connectors`.

When the dialog shows all fields on one screen, `Request headers` is under
`Advanced`. The section `Request headers` is in beta. When your account does
not show it, Claude cannot send the token yet.

To use the connector in a chat, click the `+` button, select `Connectors`,
and turn on the connector.

## Open WebUI

An administrator of Open WebUI adds the server:

1. Open `Settings > Admin > Integrations`.
2. Under `External Tool Servers`, click `+ Add Connection`.
3. Set `Type` to `MCP (Streamable HTTP)`.
4. Enter the address of the endpoint as the `Server URL`.
5. Set `Auth` to `Bearer`. Enter the token in the `Key` field. Do not type
   the word `Bearer` in the field.
6. Click `Save`. When Open WebUI asks, restart it.

Do not set `Type` to `OpenAPI`. The MCP endpoint is not an OpenAPI server.

## ChatGPT

Grocy Next does not support ChatGPT. ChatGPT cannot send a fixed header, so
it cannot send the token. A later milestone replaces the token with a user
login. Until that milestone, ChatGPT is not supported.

## The tools

The MCP server has these fourteen tools. The result of a tool is the same
body as the result of the Next API operation that the tool mirrors.

### The review queue

- `list_pending_scans`: lists each pending scan in the review queue, the
  most recent first.
- `get_pending_scan`: reads one pending scan by its id.
- `create_pending_scan`: creates a pending scan in the review queue, for you
  to accept. A pending scan with a product and no code is the way to enter a
  receipt line.
- `update_pending_scan`: changes one pending scan by its id. A field that
  the assistant does not send stays as it is. A field set to `null` is
  cleared. When the update sets a product, Grocy Next also adds the code of
  the pending scan to that product in Grocy.
- `delete_pending_scan`: deletes one pending scan by its id. A delete is a
  reject. The pending scan is gone, and the review queue keeps no history.
- `create_booking`: accepts one pending scan. The accept writes a purchase
  or an inventory in Grocy and removes the pending scan. The result is the
  booking with the stock log rows that Grocy stored.

### The products

- `list_products`: lists each product with its id, its name, and its
  description.
- `get_product`: reads one product by its id, with its units, its stock
  amount, its stock entries, and its conversions.
- `create_product`: creates a product with the short product form. The
  result is the new product as Grocy stores it.

### The master data

- `list_locations`: lists each active location with its id and its name.
- `list_stores`: lists each active store with its id and its name.
- `list_product_groups`: lists each active product group with its id and its
  name.
- `list_quantity_units`: lists each active quantity unit with its id and its
  name.
- `list_quantity_unit_conversions`: lists each household quantity unit
  conversion. A household conversion is a conversion with no product. Each
  item has the from unit id, the to unit id, and the factor.

## The token and the Grocy API key

Each tool call uses the one Grocy API key of the Grocy Next process. Grocy
sees each change from the assistant as a change from that API key.

The token does not identify a user. Each assistant that has the token is
the same to Grocy Next. Use the token only for assistants that you trust.
