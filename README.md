# status-checker

A small status dashboard for your servers. Each server runs a tiny FastAPI
service that reports its CPU, memory and disk usage; a React dashboard polls
those servers over an API key and shows live meters and trend lines.

```
┌──────────────┐   X-API-Key    ┌──────────────┐   browser   ┌──────────┐
│ server  :8000│ ◄───────────── │ client  :3000│ ◄────────── │ dashboard│
│ FastAPI      │                │ gateway+React│             │          │
└──────────────┘                └──────────────┘             └──────────┘
   one per machine                 one anywhere
```

The dashboard never sees the API keys: the client container holds them and
relays requests, so the browser only ever talks to the client.

## Quick start

Requires Docker and `make`.

```sh
make server   # start the status server on this machine
make client   # start the dashboard, watching that server
```

Open <http://localhost:3000>. The first run creates a `.env` file with a
generated `API_KEY`, which both services share.

```sh
make server-stop
make client-stop
```

## Watching several servers

1. On each machine to monitor, clone the repo and run `make server`. Note the
   `API_KEY` in its `.env`.
2. On the machine that shows the dashboard, list them in `.env`:

   ```sh
   SERVERS=Web|http://10.0.0.5:8000|key-of-web,Database|http://10.0.0.6:8000|key-of-db
   ```

3. Run `make client`.

Each entry is `name|url|api-key`. To reuse one key everywhere, set the same
`API_KEY` in every server's `.env` before starting it.

## Configuration

All settings live in `.env` (see `.env.example`).

| Variable          | Default                          | Meaning                                        |
| ----------------- | -------------------------------- | ---------------------------------------------- |
| `API_KEY`         | generated                        | Secret the server requires in `X-API-Key`      |
| `SERVER_PORT`     | `8000`                           | Host port of the server                        |
| `CLIENT_PORT`     | `3000`                           | Host port of the dashboard                     |
| `SERVERS`         | the local server                 | Servers to watch: `name\|url\|key,...`         |
| `REFRESH_SECONDS` | `5`                              | How often the dashboard polls                  |

The server reports the disk that holds Docker's data, which is the root disk on
most hosts. To report another filesystem, see the comment in
`docker-compose.yml`.

## API

`GET /api/v1/status` with header `X-API-Key: <key>`:

```json
{
  "hostname": "web-1",
  "timestamp": "2026-09-22T08:57:00Z",
  "uptime_seconds": 165459,
  "cpu": { "percent": 3.1, "cores": 8, "load_average": [0.4, 0.3, 0.2] },
  "memory": { "total": 16777216000, "used": 6442450944, "available": 10334765056, "percent": 38.4 },
  "disk": { "total": 511000000000, "used": 120000000000, "free": 391000000000, "percent": 23.5 }
}
```

Interactive docs are at <http://localhost:8000/docs>. A missing or wrong key
returns `401`.

## Development

Server (Python 3.12+):

```sh
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
API_KEY=dev uvicorn app.main:app --reload
pytest
```

Client (Node 20+). The dev server proxies `/api` to a running `make client`
gateway on port 3000:

```sh
cd client
npm install
npm run dev
```

Or run the gateway directly, without Docker:

```sh
SERVERS='Local|http://localhost:8000|dev' node gateway.mjs
```

## Security notes

- The server refuses to start without an `API_KEY` and compares keys in
  constant time.
- Both containers run as unprivileged users on read-only filesystems with all
  capabilities dropped.
- Traffic between the client and servers is plain HTTP. Across the public
  internet, put the servers behind TLS (a reverse proxy) and use `https://`
  URLs in `SERVERS`.
- The dashboard itself has no login. Anyone who can reach port 3000 can see
  the metrics, so keep it on a private network or behind your own auth proxy.

## License

Apache 2.0, see [LICENSE](LICENSE).
