# Privacy Policy

**SourceSwitch Browser Extension**

Last updated: February 2026

## Overview

SourceSwitch is a browser extension that blocks navigation to user-selected domains. This privacy policy explains how the extension handles data.

## Data Collection

**SourceSwitch does not collect, store, or transmit any personal data.**

- No analytics
- No telemetry
- No tracking
- No external network requests
- No user identification

## Data Storage

The extension stores the following data **locally on your device** using your browser's built-in storage:

- **User preferences**: Enabled presets, strict mode setting, language preference
- **Allowlist entries**: Domains you have temporarily or permanently allowed
- **Custom blocked domains**: Domains you have added to block
- **Activity log**: Local record of blocked navigations (stored on your device only, not transmitted)

All data remains on your device and is never sent to any external server.

## Permissions

The extension requests only the permissions necessary to function:

| Permission | Purpose |
|------------|---------|
| `storage` | Save your settings locally |
| `declarativeNetRequest` | Block or redirect navigation based on your configuration |
| `scripting` | Register content scripts for optional link rewriting (requires user opt-in) |
| Host permissions | Access only the specific domains you configure for blocking |

## Third Parties

SourceSwitch does not share any data with third parties because it does not collect any data.

## Changes

If this privacy policy changes, the updated version will be posted in the extension's repository.

## Contact

For questions about this privacy policy, open an issue on the GitHub repository:

https://github.com/NayiemW/sourceswitch/issues

## Open Source

SourceSwitch is open source. You can review the complete source code at:

https://github.com/NayiemW/sourceswitch
