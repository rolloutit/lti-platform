import type { CryptoKey } from "jose";

export type SigningKey = {
  kid: string;
  n: string;
  e: string;
  privateKey: CryptoKey;
};

export type Tool = {
  clientId: string;
  deploymentIds: string[];
  oidcLoginInitiationUrl: string;
  targetLinkUri: string;
};

export type Link = {
  linkId: string;
  clientId: string;
  deploymentId: string;
  targetLinkUri?: string;
  context: {
    id: string;
  };
};

export type RegistrationStore = {
  findByClientId: (clientId: string) => Promise<Tool | undefined>;
};

export type LinkStore = {
  findLink: (linkId: string) => Promise<Link | undefined>;
};

export type InitiateLoginInput = {
  linkId: string;
  currentUserId: string | undefined;
};

export type InitiateLoginResult =
  | {
      type: "redirect";
      url: string;
    }
  | {
      type: "error";
      status: number;
    };

export type AuthorizeInput = {
  params: Record<string, string | undefined>;
  currentUserId: string | undefined;
};

export type AuthorizeResult =
  | {
      type: "form_post";
      action: string;
      fields: Record<string, string>;
    }
  | {
      type: "error";
      status: number;
    };

export type Platform = {
  initiateLogin: (input: InitiateLoginInput) => Promise<InitiateLoginResult>;
  authorize: (input: AuthorizeInput) => Promise<AuthorizeResult>;
};

export type LaunchRecord = {
  messageHint: string;
  linkId: string;
  userId: string;
  clientId: string;
  deploymentId: string;
};

export type LaunchStore = {
  save: (record: LaunchRecord) => Promise<void>;
};

export type PlatformOptions = {
  issuer: string;
  registrations: RegistrationStore;
  links: LinkStore;
  launches: LaunchStore;
  users: UserStore;
};

export type User = {
  userId: string;
};

export type UserStore = {
  findUser: (userId: string) => Promise<User | undefined>;
  getRoles: (userId: string, contextId: string) => Promise<string[]>;
};
