declare module 'oidc-provider' {
  export interface KoaContextWithOIDC {
    [key: string]: any;
  }

  export interface Account {
    accountId: string;
    claims(): Promise<Record<string, any>>;
  }

  export interface Client {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
    response_types: string[];
    grant_types: string[];
  }

  export interface Configuration {
    clients: Client[];
    features?: {
      devInteractions?: {
        enabled: boolean;
      };
    };
    findAccount?(ctx: KoaContextWithOIDC, id: string): Promise<Account | undefined>;
  }

  export class Provider {
    constructor(issuer: string, configuration: Configuration);
    callback(): any;
    interactionDetails(req: any, res: any): Promise<{ uid: string; prompt: { name: string } }>;
    interactionFinished(req: any, res: any, result: any, options?: any): Promise<void>;
  }
}
