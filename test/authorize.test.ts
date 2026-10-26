import { expect, test } from "vitest";
import { launch, makePlatform } from "./helpers/platform.js";

const params = {
  scope: "openid",
  response_type: "id_token",
  response_mode: "form_post",
  prompt: "none",
  client_id: "client-1",
  redirect_uri: "https://tool.example.com/lti/launch",
  login_hint: "123",
  lti_message_hint: "message-hint-1",
  nonce: "nonce-1",
  state: "state-1",
};

test("valid request is answered with a form post to the redirect_uri", async () => {
  const platform = makePlatform();

  const result = await platform.authorize({ params, currentUserId: "123" });

  expect(result).toEqual({
    type: "form_post",
    action: "https://tool.example.com/lti/launch",
    fields: { state: "state-1" },
  });
});

test("unknown client_id is answered with a 400 error", async () => {
  const platform = makePlatform();

  const result = await platform.authorize({
    params: { ...params, client_id: "client-999" },
    currentUserId: "123",
  });

  expect(result).toEqual({
    type: "error",
    status: 400,
  });
});

test.each([
  "https://tool.example.com/lti/launch/",
  "https://tool.example.com/lti/launch?x=1",
  "https://evil.example.com/lti/launch",
  undefined,
])("redirect_uri %s is answered with a 400 error", async (redirectUri) => {
  const platform = makePlatform();

  const result = await platform.authorize({
    params: { ...params, redirect_uri: redirectUri },
    currentUserId: "123",
  });

  expect(result).toEqual({
    type: "error",
    status: 400,
  });
});

test.each(["query", "fragment", undefined])(
  "response_mode %s is answered with a 400 error",
  async (responseMode) => {
    const platform = makePlatform();

    const result = await platform.authorize({
      params: { ...params, response_mode: responseMode },
      currentUserId: "123",
    });

    expect(result).toEqual({
      type: "error",
      status: 400,
    });
  },
);

test("registration store failure is answered with a 500 error", async () => {
  const platform = makePlatform({
    registrations: {
      findByClientId: async () => {
        throw new Error("db down");
      },
    },
  });

  const result = await platform.authorize({
    params,
    currentUserId: "123",
  });

  expect(result).toEqual({
    type: "error",
    status: 500,
  });
});

test.each(["profile", "openid profile", "", undefined])(
  "scope %s is posted back to the tool as invalid_scope",
  async (scope) => {
    const platform = makePlatform();

    const result = await platform.authorize({
      params: { ...params, scope },
      currentUserId: "123",
    });

    expect(result).toEqual({
      type: "form_post",
      action: "https://tool.example.com/lti/launch",
      fields: { error: "invalid_scope", state: "state-1" },
    });
  },
);

// response_type must be id_token, 1EdTech Security Framework 5.1.1.2:
// https://www.imsglobal.org/spec/security/v1p0/#step-2-authentication-request
// Error code from RFC 6749 4.2.2.1:
// https://www.rfc-editor.org/rfc/rfc6749#section-4.2.2.1
test.each(["code", "id_token token", "", undefined])(
  "response_type %s is posted back to the tool as unsupported_response_type",
  async (responseType) => {
    const platform = makePlatform();

    const result = await platform.authorize({
      params: { ...params, response_type: responseType },
      currentUserId: "123",
    });

    expect(result).toEqual({
      type: "form_post",
      action: "https://tool.example.com/lti/launch",
      fields: { error: "unsupported_response_type", state: "state-1" },
    });
  },
);

// prompt=none, nonce, login_hint and lti_message_hint are required, 1EdTech Security Framework 5.1.1.2:
// https://www.imsglobal.org/spec/security/v1p0/#step-2-authentication-request
// Error code from RFC 6749 4.2.2.1:
// https://www.rfc-editor.org/rfc/rfc6749#section-4.2.2.1
test.each([
  { prompt: "login" },
  { prompt: undefined },
  { nonce: undefined },
  { nonce: "" },
  { login_hint: undefined },
  { login_hint: "" },
  { lti_message_hint: undefined },
  { lti_message_hint: "" },
])("%o is posted back to the tool as invalid_request", async (override) => {
  const platform = makePlatform();

  const result = await platform.authorize({
    params: { ...params, ...override },
    currentUserId: "123",
  });

  expect(result).toEqual({
    type: "form_post",
    action: "https://tool.example.com/lti/launch",
    fields: { error: "invalid_request", state: "state-1" },
  });
});

test.each([undefined, "456"])(
  "current user %s is posted back to the tool as login_required",
  async (currentUserId) => {
    const platform = makePlatform();

    const result = await platform.authorize({ params, currentUserId });

    expect(result).toEqual({
      type: "form_post",
      action: "https://tool.example.com/lti/launch",
      fields: { error: "login_required", state: "state-1" },
    });
  },
);

test("unknown lti_message_hint is posted back to the tool as invalid_request", async () => {
  const platform = makePlatform();

  const result = await platform.authorize({
    params: { ...params, lti_message_hint: "message-hint-999" },
    currentUserId: "123",
  });

  expect(result).toEqual({
    type: "form_post",
    action: "https://tool.example.com/lti/launch",
    fields: { error: "invalid_request", state: "state-1" },
  });
});

test.each([
  { clientId: "client-2" },
  { userId: "456" },
  { deploymentId: "deployment-2" },
])(
  "launch record with %o is posted back to the tool as invalid_request",
  async (override) => {
    const platform = makePlatform({
      launches: {
        save: async () => {},
        consume: async () => ({ ...launch, ...override }),
      },
    });

    const result = await platform.authorize({ params, currentUserId: "123" });

    expect(result).toEqual({
      type: "form_post",
      action: "https://tool.example.com/lti/launch",
      fields: { error: "invalid_request", state: "state-1" },
    });
  },
);

test("launched more than 5 minutes ago is posted back to the tool as invalid_request", async () => {
  const platform = makePlatform({
    now: () => launch.createdAt + 5 * 60 * 1000 + 1,
  });

  const result = await platform.authorize({ params, currentUserId: "123" });

  expect(result).toEqual({
    type: "form_post",
    action: "https://tool.example.com/lti/launch",
    fields: { error: "invalid_request", state: "state-1" },
  });
});

test("launched exactly 5 minutes ago is still answered with a form post", async () => {
  const platform = makePlatform({
    now: () => launch.createdAt + 5 * 60 * 1000,
  });

  const result = await platform.authorize({ params, currentUserId: "123" });

  expect(result).toEqual({
    type: "form_post",
    action: "https://tool.example.com/lti/launch",
    fields: { state: "state-1" },
  });
});

test("request error does not consume the lti_message_hint", async () => {
  const consumed: string[] = [];
  const platform = makePlatform({
    launches: {
      save: async () => {},
      consume: async (messageHint) => {
        consumed.push(messageHint);
        return launch;
      },
    },
  });

  const result = await platform.authorize({
    params: { ...params, scope: "profile" },
    currentUserId: "123",
  });

  expect(result).toEqual({
    type: "form_post",
    action: "https://tool.example.com/lti/launch",
    fields: { error: "invalid_scope", state: "state-1" },
  });
  expect(consumed).toEqual([]);
});

test("launch store failure is posted back to the tool as server_error", async () => {
  const platform = makePlatform({
    launches: {
      save: async () => {},
      consume: async () => {
        throw new Error("db down");
      },
    },
  });

  const result = await platform.authorize({ params, currentUserId: "123" });

  expect(result).toEqual({
    type: "form_post",
    action: "https://tool.example.com/lti/launch",
    fields: { error: "server_error", state: "state-1" },
  });
});
