import type {
  AuthorizeInput,
  AuthorizeResult,
  PlatformOptions,
  Tool,
} from "./types.js";

export const authorize = async (
  input: AuthorizeInput,
  options: PlatformOptions,
): Promise<AuthorizeResult> => {
  if (!input.params.client_id) {
    return { type: "error", status: 400 };
  }

  let tool: Tool | undefined;

  try {
    tool = await options.registrations.findByClientId(input.params.client_id);
    if (!tool) {
      return { type: "error", status: 400 };
    }
  } catch (error) {
    console.error(error);
    return { type: "error", status: 500 };
  }

  const redirectUri = input.params.redirect_uri;
  if (!redirectUri || !tool.redirectUris.includes(redirectUri)) {
    return { type: "error", status: 400 };
  }

  const responseMode = input.params.response_mode;
  if (!responseMode || responseMode !== "form_post") {
    return { type: "error", status: 400 };
  }

  const fields: Record<string, string> = {};
  if (input.params.state !== undefined) {
    fields.state = input.params.state;
  }

  if (input.params.scope !== "openid") {
    return {
      type: "form_post",
      action: redirectUri,
      fields: { error: "invalid_scope", ...fields },
    };
  }

  return { type: "form_post", action: redirectUri, fields };
};
