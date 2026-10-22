import { expect, test } from "vitest";
import { makePlatform } from "./helpers/platform.js";

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
