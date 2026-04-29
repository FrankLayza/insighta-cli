# Insighta CLI

Insighta Labs+ Command Line Interface — A high-performance profile intelligence tool for analysts and administrators.

## 🛠 Installation

Follow these steps to set up the CLI locally:

```bash
# 1. Install dependencies
pnpm install

# 2. Build the project
pnpm run build

# 3. Link globally
npm link
```

## ⚙️ Environment Setup

The CLI needs to know where your backend is running. Create a `.env` file in the root of the `insighta-cli` directory:

```env
INSIGHTA_BACKEND_URL="http://localhost:3110"
```

## 🚀 Usage

Once linked, you can use the `insighta` command from anywhere in your terminal.

### Authentication
```bash
insighta login   # Opens browser for GitHub OAuth
insighta whoami  # Show current user and role
insighta logout  # Clear stored credentials
```

### Profile Management
```bash
insighta profiles        # List profiles (supports --page, --limit, --gender, --sort)
insighta profile <id>    # Get specific profile details
insighta delete <id>     # Delete a profile (Admin only)
```

### Intelligence Features
```bash
# Natural Language Search
insighta search "men from Nigeria over 30"
insighta search "women from London in their 20s"

# Administrative Export
insighta export -o data.csv
```

## 🔐 Security & Tokens

- **Credentials**: Stored securely at `~/.insighta/credentials.json`.
- **Auto-Refresh**: The CLI automatically refreshes your access token using the refresh token if it has expired.
- **PKCE**: Uses S256 PKCE flow for secure OAuth exchange without exposing client secrets.

## 💻 Development

Run in development mode without building:
```bash
pnpm run dev -- login
pnpm run dev -- profiles
```
