import { CONTEXT_ROLES, type Link, type Tool } from "@rolloutit/lti-platform";

export const ISSUER = "http://localhost:4000";

// saLTIre (https://saltire.lti.app/tool) takes the login, the redirect and the
// launch on the same URL. client_id and deployment_id are ours to pick, they
// have to be entered in saLTIre the same way.
export const saltire: Tool = {
  clientId: "saltire",
  deploymentIds: ["saltire-1"],
  oidcLoginInitiationUrl: "https://saltire.lti.app/tool",
  targetLinkUri: "https://saltire.lti.app/tool",
  redirectUris: ["https://saltire.lti.app/tool"],
};

export const tools: Tool[] = [saltire];

export const users = [
  { userId: "1", name: "Tom Teacher" },
  { userId: "2", name: "Sam Student" },
];

export const course = { id: "101", title: "LTI 101" };

export const roles: Record<string, string[]> = {
  "1": [CONTEXT_ROLES.Instructor],
  "2": [CONTEXT_ROLES.Learner],
};

export const links: (Link & { title: string })[] = [
  {
    linkId: "1",
    title: "saLTIre test",
    clientId: "saltire",
    deploymentId: "saltire-1",
    context: { id: course.id },
  },
];
