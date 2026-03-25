# crossmind

Agent-native CLI for 15 social platforms. Compact, parseable output by default. JSON mode for structured pipelines.

## Install

```bash
npm install -g crossmind
# or
pnpm add -g crossmind
```

## Quick Start

```bash
# Public platforms — no auth required
crossmind hn top 10
crossmind reddit r MachineLearning 25 --sort top --time week
crossmind gh trending --lang typescript
crossmind arxiv search "transformer architecture" --cat cs.AI 10

# Authenticate for write access
crossmind auth login x --auth-token <token> --ct0 <ct0>
crossmind auth login reddit
crossmind auth login bsky --handle user.bsky.social --app-password <password>

# Write operations
crossmind x post "Hello from crossmind"
crossmind reddit comment t3_abc123 "Great post!"
crossmind bsky post "Testing crossmind CLI"
```

## Output Format

Default: compact single-line, agent-friendly. No emoji, no abbreviations, full integers.

```
1. score:342 comments:87 Show HN: We built a CLI for 15 social platforms https://...
2. score:198 comments:44 Ask HN: What tools do you use for social data? https://...
```

Add `--json` for structured output:

```bash
crossmind hn top 5 --json
```

## Platforms

| Command   | Platform        | Auth         | Read | Write |
|-----------|-----------------|--------------|------|-------|
| `hn`      | Hacker News     | None         | Yes  | No    |
| `lb`      | Lobsters        | None         | Yes  | No    |
| `dev`     | DEV.to          | None         | Yes  | No    |
| `so`      | Stack Overflow  | None         | Yes  | No    |
| `arxiv`   | arXiv           | None         | Yes  | No    |
| `gh`      | GitHub          | Optional PAT | Yes  | No    |
| `ph`      | Product Hunt    | API key      | Yes  | No    |
| `x`       | X (Twitter)     | Cookie/OAuth | Yes  | Yes   |
| `reddit`  | Reddit          | OAuth PKCE   | Yes  | Yes   |
| `bsky`    | Bluesky         | App password | Yes  | Yes   |
| `yt`      | YouTube         | API key      | Yes  | No    |
| `med`     | Medium          | None (RSS)   | Yes  | No    |
| `sub`     | Substack        | None (RSS)   | Yes  | No    |
| `ig`      | Instagram       | Cookie       | Yes  | No    |
| `li`      | LinkedIn        | Cookie       | Yes  | No    |

## Authentication

### X (Twitter)

**Cookie auth** (for reads + writes via cookie session):
```bash
crossmind auth login x --auth-token <auth_token> --ct0 <ct0>
```
Get cookies from browser DevTools → Application → Cookies → twitter.com

**Or use browser extraction:**
```bash
crossmind extract-cookie x
```

### Reddit

OAuth 2.0 PKCE flow (opens browser):
```bash
export REDDIT_CLIENT_ID=your_client_id
crossmind auth login reddit
```

### Bluesky

App password (Settings → Privacy and Security → App Passwords):
```bash
crossmind auth login bsky --handle yourhandle.bsky.social --app-password xxxx-xxxx-xxxx-xxxx
```

### GitHub

Personal access token:
```bash
crossmind auth login gh --token ghp_xxxxxxxxxxxx
```

### YouTube

Google API key (console.cloud.google.com → YouTube Data API v3):
```bash
crossmind auth login yt --token AIzaSy...
```

### Instagram / LinkedIn

Browser cookie extraction (opens Playwright browser):
```bash
crossmind extract-cookie instagram
crossmind extract-cookie linkedin
```

## Commands Reference

### Hacker News (`hn`)

```bash
crossmind hn top [limit]         # Top stories
crossmind hn new [limit]         # Newest stories
crossmind hn ask [limit]         # Ask HN
crossmind hn show [limit]        # Show HN
crossmind hn jobs [limit]        # Job postings
```

### Lobsters (`lb`)

```bash
crossmind lb top [limit]         # Hottest stories
crossmind lb new [limit]         # Newest stories
crossmind lb hottest [limit]     # Hottest (24h)
```

### DEV.to (`dev`)

```bash
crossmind dev top [limit]                # Top articles (past week)
crossmind dev latest [limit]             # Latest articles
crossmind dev search <query> [limit]     # Search by tag/keyword
```

### Stack Overflow (`so`)

```bash
crossmind so top [limit]                           # Top questions by votes
crossmind so search <query> [limit]                # Search questions
crossmind so trending [limit]                      # Most active today
crossmind so top [limit] --tag javascript          # Filter by tag
```

### arXiv (`arxiv`)

```bash
crossmind arxiv search <query> [limit] --cat cs.AI  # Search papers
crossmind arxiv recent [limit] --cat cs.LG          # Recent by category
```

Categories: `cs.AI`, `cs.LG`, `cs.CL`, `cs.CV`, `stat.ML`, `math.OC`, etc.

### GitHub (`gh`)

```bash
crossmind gh search <query> [limit] --sort stars    # Search repos
crossmind gh trending [limit] --lang python          # Trending repos
crossmind gh issues <owner/repo> [limit]             # List issues
crossmind gh releases <owner/repo> [limit]           # List releases
```

### Product Hunt (`ph`)

```bash
crossmind ph top [limit] --date 2024-01-15   # Top products by date
crossmind ph search <query> [limit]           # Search products
```

### X / Twitter (`x`)

```bash
# Read
crossmind x search <query> [limit]           # Search recent tweets
crossmind x timeline <username> [limit]      # User timeline
crossmind x home [limit]                     # Home feed (auth required)
crossmind x profile <username>               # User profile

# Write (requires auth)
crossmind x post <text>
crossmind x reply <tweet_id> <text>
crossmind x like <tweet_id>
crossmind x retweet <tweet_id>
crossmind x follow <username>
crossmind x dm <username> <text>
crossmind x delete <tweet_id>
```

### Reddit (`reddit`)

```bash
# Read
crossmind reddit r <subreddit> [limit] --sort hot --time day
crossmind reddit search <query> [limit] --sub MachineLearning
crossmind reddit comments <subreddit> <post_id> [limit]

# Write (requires OAuth)
crossmind reddit comment <parent_id> <text>   # parent_id: t3_xxx or t1_xxx
crossmind reddit upvote <id>                   # fullname: t3_xxx or t1_xxx
crossmind reddit downvote <id>
crossmind reddit save <id>
crossmind reddit subscribe <subreddit>
crossmind reddit post <subreddit> <title> <url>
```

### Bluesky (`bsky`)

```bash
# Read
crossmind bsky timeline [limit]
crossmind bsky search <query> [limit]
crossmind bsky feed <handle> [limit]
crossmind bsky profile <handle>

# Write (requires app password)
crossmind bsky post <text>
crossmind bsky reply <post_uri> <post_cid> <text>
crossmind bsky like <post_uri> <post_cid>
crossmind bsky repost <post_uri> <post_cid>
crossmind bsky follow <handle>
crossmind bsky delete <uri>
```

### YouTube (`yt`)

```bash
crossmind yt search <query> [limit]     # Search videos (API key required)
crossmind yt channel <channel_id>       # Channel info
```

### Medium (`med`)

```bash
crossmind med feed <publication> [limit]    # Publication feed
crossmind med profile <username> [limit]    # User's posts
crossmind med tag <tag> [limit]             # Posts by tag
```

### Substack (`sub`)

```bash
crossmind sub feed <newsletter> [limit]     # Newsletter posts (e.g. "lenny")
crossmind sub latest <newsletter> [limit]   # Latest posts
```

### Instagram (`ig`)

```bash
crossmind ig profile <username>             # User profile
crossmind ig posts <username> [limit]       # Recent posts
```

### LinkedIn (`li`)

```bash
crossmind li profile <username>             # Profile (URL username)
crossmind li feed [limit]                   # Home feed
```

## Account Management

```bash
crossmind account list [platform]           # List all accounts
crossmind account use <platform> <name>     # Set default account
crossmind account remove <platform> <name>  # Remove credentials
crossmind account show <platform> [name]    # Show credential info

crossmind auth status                       # Auth status for all platforms
crossmind auth logout <platform> [name]     # Remove credentials
```

## Multi-Account Support

```bash
# Save multiple X accounts
crossmind auth login x work --auth-token <token1> --ct0 <ct0_1>
crossmind auth login x personal --auth-token <token2> --ct0 <ct0_2>

# Use a specific account
crossmind x post "Work tweet" --account work
crossmind x timeline elonmusk --account personal

# Set default
crossmind account use x work
```

## Data Directory

Credentials and daily write limits are stored in `~/.crossmind/` by default.

Override per-command:
```bash
crossmind x post "hello" --data-dir /tmp/crossmind-test
```

Or set globally:
```bash
export CROSSMIND_DATA_DIR=/path/to/data
```

## Safety Policies

- Daily write limits enforced per platform and action type
- Random jitter delay (1.5–4s) between write operations
- Exponential backoff on rate limit errors (429)
- No writes without explicit commands — reads are always safe

## Requirements

- Node.js 18+
- pnpm or npm

## License

MIT
