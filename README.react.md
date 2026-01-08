# HyperKYC React Demo

This is a small React (Vite) app wrapping the HyperKYC quick launcher demo.

Quick start

1. Install dependencies:

```fish
npm install
```

2. Start the dev server:

```fish
npm run dev
```

3. Open the dev URL printed by Vite (or use the ngrok helper `./run-https.fish` to expose over HTTPS and test the SDK).

Notes

- The app includes the same SDK loader/launch logic as the earlier demo and supports dynamic SDK loading by version.
- For local SDK testing you still need an HTTPS context (use ngrok or mkcert as described in the main README).
