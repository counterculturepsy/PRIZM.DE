export type Confidence = "high" | "medium" | "low";
export type FactKind = "observed" | "user_supplied" | "inferred" | "unknown";

export type SourcedValue<T> = Readonly<{
  value: T;
  kind: FactKind;
  confidence: Confidence;
  source: string;
  observedAt: string;
}>;

export type BusinessSearchQuery = Readonly<{
  countryCode: string;
  region?: string;
  city?: string;
  industries: readonly string[];
  cursor?: string;
}>;

export type BusinessSearchRecord = Readonly<{
  externalId: string;
  name: SourcedValue<string>;
  website?: SourcedValue<string>;
  phone?: SourcedValue<string>;
}>;

export interface BusinessSearchProvider {
  readonly id: string;
  search(query: BusinessSearchQuery): Promise<Readonly<{ records: readonly BusinessSearchRecord[]; cursor?: string }>>;
}

export type MapsProvider = BusinessSearchProvider;

export interface ContactProvider {
  readonly id: string;
  findPublicChannels(domain: string): Promise<readonly SourcedValue<string>[]>;
}

export interface TechnologyProvider {
  readonly id: string;
  inspect(url: URL): Promise<readonly SourcedValue<string>[]>;
}

export interface SeoProvider {
  readonly id: string;
  inspect(url: URL): Promise<readonly SourcedValue<string>[]>;
}

export interface WebsiteAuditProvider {
  readonly id: string;
  audit(url: URL): Promise<readonly SourcedValue<string>[]>;
}

export class ProviderRegistry<TProvider extends { readonly id: string }> {
  readonly #providers = new Map<string, TProvider>();

  register(provider: TProvider): void {
    if (this.#providers.has(provider.id)) throw new Error(`Provider already registered: ${provider.id}`);
    this.#providers.set(provider.id, provider);
  }

  get(id: string): TProvider | undefined {
    return this.#providers.get(id);
  }

  list(): readonly TProvider[] {
    return [...this.#providers.values()];
  }
}

export class ProviderUnavailableError extends Error {
  constructor(providerId: string) {
    super(`Provider is not configured: ${providerId}`);
    this.name = "ProviderUnavailableError";
  }
}
