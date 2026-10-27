import { createApp } from "./app.js";
import { ISSUER, saltire } from "./data.js";
import { loadSigningKey, publicKeyPem } from "./keys.js";

const port = 4000;
const signingKey = await loadSigningKey();

createApp(signingKey).listen(port, () => {
  console.log(`Mini LMS on ${ISSUER}

saLTIre (https://saltire.lti.app/tool), Security Model, signature method RS256:
  Platform/Issuer ID:         ${ISSUER}
  Client ID:                  ${saltire.clientId}
  Deployment ID:              ${saltire.deploymentIds.join(", ")}
  Authentication request URL: ${ISSUER}/lti/authorize
  Access Token service URL:   (empty)
  Public Keyset URL:          (empty)
  Public Key ID:              ${signingKey.kid}
  Public key:
${publicKeyPem(signingKey)}`);
});
