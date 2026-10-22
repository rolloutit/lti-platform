import type {
  AuthorizeInput,
  AuthorizeResult,
  PlatformOptions,
} from "./types.js";

export const authorize = async (
  input: AuthorizeInput,
  options: PlatformOptions,
): Promise<AuthorizeResult> => {
  if (!input.params.client_id) {
    return { type: "error", status: 400 };
  }

  const tool = await options.registrations.findByClientId(
    input.params.client_id,
  );
  if (!tool) {
    return { type: "error", status: 400 };
  }

  const redirectUri = input.params.redirect_uri;

  if (!redirectUri || !tool.redirectUris.includes(redirectUri)) {
    return { type: "error", status: 400 };
  }

  const fields: Record<string, string> = {};
  if (input.params.state !== undefined) {
    fields.state = input.params.state;
  }

  return { type: "form_post", action: redirectUri, fields };
};
