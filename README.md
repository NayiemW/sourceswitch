# SourceSwitch

SourceSwitch is a browser extension that gives you direct control over which websites and services your browser can access, and when available, offers alternative destinations instead of simply stopping the page.

It runs entirely in your browser, stores everything locally, and does exactly what you configure it to do. Nothing more.

## Features

**Domain Blocking**
Block navigation to selected domains with a clear, neutral block page.

**Alternative Redirects**
Certain pages can offer alternative sources when available.

**Custom Domains**
Add your own domains to block or allow.

**Strict Mode (Optional)**
Block selected third-party API or subresource requests for stricter enforcement.

**Global Link Rewriting (Optional)**
Rewrite specific links across websites to reduce accidental clicks.

**Local Activity View**
See when blocks or rewrites occur (stored locally only).

**Allowlist & Temporary Bypass**
Allow once, allow for a limited time, or permanently allow a site.

**Export / Import Settings**
Backup and restore your configuration.

## Installation

### From Source

Clone the repository:

```bash
git clone https://github.com/NayiemW/sourceswitch.git
cd sourceswitch
```

Install dependencies:

```bash
pnpm install
```

Build the extension:

```bash
pnpm build:chrome
```

Load in Chrome:

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/chrome/` folder

### From Release

1. Download the latest release archive
2. Extract it to a folder
3. Load the `dist/chrome/` folder in Chrome as described above

## Usage

### Default Behavior

SourceSwitch ships with a small, editable default preset enabled.
This preset can be disabled or modified at any time.

By default, direct navigation is blocked for:

- binance.com
- binance.us
- binance.tr
- coinmarketcap.com
- trustwallet.com

When a page is blocked, you'll see options to:

- Open an alternative source (when available)
- Allow once (single navigation)
- Allow for 10 minutes
- Manage settings

Pages that merely mention these URLs as text are never blocked.

### Settings

Click the extension icon to access settings:

| Setting | Description |
|---------|-------------|
| Presets | Enable or disable preset domain groups |
| Strict Mode | Also block selected API / subresource requests |
| Global Link Rewriting | Rewrite supported links on websites (optional) |
| Rewrite Exceptions | Disable rewriting on specific sites |
| Domain Allowlist | Permanently allow specific domains |
| API Allowlist | Allow specific endpoints in Strict Mode |
| Language | System default, English, or Türkçe |

### Language Support

SourceSwitch supports multiple languages using standard browser localization.

- English
- Turkish (Türkçe)

By default, the extension follows your browser's language.
You can optionally override this in settings.

## Privacy

SourceSwitch does not collect, store, or transmit personal data.

- No analytics
- No telemetry
- No tracking
- No external network requests initiated by the extension

All settings and activity information are stored locally using browser storage.

## Permissions

SourceSwitch requests only the permissions required to function:

| Permission | Purpose |
|------------|---------|
| `storage` | Save settings locally |
| `declarativeNetRequest` | Block or redirect navigation based on user configuration |
| `scripting` | Register content scripts for optional link rewriting |
| host permissions (specific) | Access only the domains configured for blocking |
| optional host permissions | Requested only if global link rewriting is enabled |

## Supported Browsers

- Chromium-based browsers (Chrome, Edge, Brave, etc.)
- Safari (macOS and iOS via Safari Web Extension packaging)

Feature availability may vary slightly depending on browser platform limitations.

## Open Source

SourceSwitch is released under the MIT License.

The source code is public so anyone can audit how it works, build it locally, or adapt it for their own use.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by any third party.
All product and service names referenced within the extension are the property of their respective owners.

SourceSwitch provides user-controlled filtering and redirection at the browser level.

## License

MIT License
