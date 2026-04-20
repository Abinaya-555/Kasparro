import { createApp } from "./app";
import { env } from "./config/env";
import { SHOPIFY_ACCESS_TOKEN, SHOPIFY_STORE_URL } from "./config/shopify";

const app = createApp();

app.listen(env.port, () => {
  // This log is intentionally simple for ops visibility in dev/hackathon demos.
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.port} (${env.nodeEnv})`);

  if (!SHOPIFY_STORE_URL.trim() || !SHOPIFY_ACCESS_TOKEN.trim()) {
    // eslint-disable-next-line no-console
    console.log(
      "Shopify integration disabled (missing env). Set SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN to enable /api/v1/shopify/*.",
    );
  }
});

