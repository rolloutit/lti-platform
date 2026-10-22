import { randomBytes } from "node:crypto";
import { authorize } from "./authorize.js";
import type {
  InitiateLoginInput,
  InitiateLoginResult,
  Platform,
  PlatformOptions,
} from "./types.js";

export const initiateLogin = async (
  input: InitiateLoginInput,
  options: PlatformOptions,
): Promise<InitiateLoginResult> => {
  if (!input.currentUserId) {
    return { type: "error", status: 401 };
  }

  try {
    const link = await options.links.findLink(input.linkId);
    if (!link) {
      return { type: "error", status: 404 };
    }

    const tool = await options.registrations.findByClientId(link.clientId);
    if (!tool) {
      return { type: "error", status: 500 };
    }

    if (!tool.deploymentIds.includes(link.deploymentId)) {
      return { type: "error", status: 500 };
    }

    const user = await options.users.findUser(input.currentUserId);
    if (!user) {
      return { type: "error", status: 403 };
    }

    const roles = await options.users.getRoles(
      input.currentUserId,
      link.context.id,
    );
    if (roles.length === 0) {
      return { type: "error", status: 403 };
    }

    const messageHint = randomBytes(32).toString("base64url");
    await options.launches.save({
      messageHint,
      clientId: tool.clientId,
      deploymentId: link.deploymentId,
      userId: input.currentUserId,
      linkId: link.linkId,
    });

    const url = new URL(tool.oidcLoginInitiationUrl);
    url.searchParams.set("iss", options.issuer);
    url.searchParams.set("login_hint", input.currentUserId);
    url.searchParams.set("lti_message_hint", messageHint);
    url.searchParams.set(
      "target_link_uri",
      link.targetLinkUri ?? tool.targetLinkUri,
    );
    url.searchParams.set("client_id", tool.clientId);
    url.searchParams.set("lti_deployment_id", link.deploymentId);
    return { type: "redirect", url: url.href };
  } catch (error) {
    console.error(error);
    return { type: "error", status: 500 };
  }
};

export const createPlatform = (options: PlatformOptions): Platform => {
  return {
    initiateLogin: (input) => initiateLogin(input, options),
    authorize: (input) => authorize(input, options),
  };
};
