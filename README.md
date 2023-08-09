# Tezos Faucet Frontend

## Presentation

One-click faucet for Tezos.

### Made with

- Typescript
- Vite
- React
- Bootstrap
- Taquito
- Beacon Wallet

## Overview

The faucet backend code can be found at https://github.com/oxheadalpha/tezos-faucet-backend.

Backend handles:

- faucet private key
- captcha secret
- amounts sent

Sent amounts are configured in backend, using a conf named `profiles`.

2 profiles are created: **User**, to get 1 xtz and **Baker** to get 6000 xtz.

Faucet calls backend using the target address and the given profile name. The backend sends as many xtz as configured to on its side for the given profile.

This enforces security, avoiding a user trying to change amounts in frontend javascript code and drying out the faucet.

## Setup

To setup the faucet for a new network:

1. Update Beacon Wallet lib to make sure it will handle the new network
2. Deploy a new instance of backend
3. Configure faucet to use backend
4. Deploy faucet

### 1. Update Beacon Wallet configuration for new network

Currently supported networks include:

- Mainnet
- Ghostnet
- Mondaynet
- Dailynet
- Nairobinet

To add a new network, first check that `@airgap/beacon-sdk` handles it ([check their config](https://github.com/airgap-it/beacon-sdk/blob/v4.0.6/packages/beacon-types/src/types/beacon/NetworkType.ts)), then update:

```
npm i @airgap/beacon-sdk
```

And in `Config.tsx`, add the `case` for the new network using `NetworkType`.

### 2. Deploy backend

See https://github.com/oxheadalpha/tezos-faucet-backend

### 3. Update configuration file: `config.json`

**Application configuration:**

`name`: application name, displayed in header

`googleCaptchaSiteKey`: Google ReCAPTCHA public site key

`backendUrl`: Base URL of faucet backend to connect to.

`githubRepo`: URL of Github repository (displayed in header with Github icon).

`profiles`: backend profiles, must match backend configuration.

-- `user`: user profile, to get a single XTZ

-- `baker`: baker profile, to get 6000 XTZ

-- -- `profile`: backend profile ID (`USER` or `BAKER`)

-- -- `amount`: amount given for the profile, for display only.

**Network configuration:**

`name`: network name. Must match one of [@airgap/beacon-sdk NetworkType](https://github.com/airgap-it/beacon-sdk/blob/v4.0.6/packages/beacon-types/src/types/beacon/NetworkType.ts) value (case insensitive). Also used to be displayed.

`rpcUrl`: Tezos network RPC endpoint to be used by faucet

`faucetAddress`: public Tezos address of faucet

`viewer`: URL of a viewer that displays operation detail like `http://viewer-url.com/{tx_hash}` (eg. https://ghost.tzstats.com)

### 4. Deploy

Deploy with Docker using Dockerfile.

Build Docker image:

```
docker build . -t tezos-faucet
```

Run Docker image:

```
docker run -p 8080:8080 tezos-faucet
```
