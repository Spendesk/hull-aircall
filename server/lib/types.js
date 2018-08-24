/* @flow */
import type {
  HullAccount,
  HullUserIdent,
  HullAccountIdent,
  HullUserAttributes,
  HullAccountAttributes,
  HullUser,
  HullUserUpdateMessage
} from "hull";

/*
 *** Hull Types. Replace when 0.14.0 is released
 */

export type HullMetrics = {
  increment(name: string, value: number, ...params: any[]): void,
  value(name: string, value: number, ...params: any[]): void
};

export type HullClientLogger = {
  log(message: ?any, ...optionalParams: any[]): void,
  info(message: ?any, ...optionalParams: any[]): void,
  warn(message: ?any, ...optionalParams: any[]): void,
  error(message: ?any, ...optionalParams: any[]): void,
  debug(message: ?any, ...optionalParams: any[]): void
};

export type HullClientConfiguration = {
  prefix: string,
  domain: string,
  protocol: string,
  id: string,
  secret: string,
  organization: string,
  version: string
};

export type HullClientApiOptions = {
  timeout: number,
  retry: number
};

export type HullClientUtilTraits = {
  group(user: HullUser | HullAccount): Object,
  normalize(traits: Object): HullUserAttributes
};

export type HullClientUtils = {
  traits: HullClientUtilTraits
};

export type HullClientTraitsContext = {
  source: string
};

export type HullFieldDropdownItem = {
  value: string,
  label: string
};

/**
 * This is an event name which we use when tracking an event
 */
export type HullEventName = string;

/**
 * This is are event's properties which we use when tracking an event
 */
export type HullEventProperties = {
  [HullEventProperty: string]: string
};

/**
 * This is additional context passed with event
 */
export type HullEventContext = {
  location?: {},
  page?: {
    referrer?: string
  },
  referrer?: {
    url: string
  },
  os?: {},
  useragent?: string,
  ip?: string | number
};

export type HullClient = {
  configuration: HullClientConfiguration,
  asUser(ident: HullUserIdent): HullClient,
  asAccount(ident: HullAccountIdent): HullClient,
  logger: HullClientLogger,
  traits(
    attributes: HullUserAttributes | HullAccountAttributes,
    context: HullClientTraitsContext
  ): Promise<any>, // Needs to be refined further
  track(
    event: string,
    properties: HullEventProperties,
    context: HullEventContext
  ): Promise<any>,
  get(
    url: string,
    params?: Object,
    options?: HullClientApiOptions
  ): Promise<any>,
  post(
    url: string,
    params?: Object,
    options?: HullClientApiOptions
  ): Promise<any>,
  put(
    url: string,
    params?: Object,
    options?: HullClientApiOptions
  ): Promise<any>,
  del(
    url: string,
    params?: Object,
    options?: HullClientApiOptions
  ): Promise<any>,
  account(ident: HullAccountIdent): HullClient,
  utils: HullClientUtils
};

/*
 *** Aircall Types, specific to this connector
 */

export type AircallOutboundMapping = {
  hull_field_name: string,
  aircall_field_name: string
};

export type AircallConnectorSettings = {
  api_key: string,
  synchronized_user_segments: Array<string>,
  contact_attributes_outbound: Array<AircallOutboundMapping>,
  contact_attributes_inbound: Array<string>,
  last_sync_at: string
};

export type AircallAttributesMapping = {
  contact_attributes_outbound: Array<AircallOutboundMapping>,
  contact_attributes_inbound: Array<string>
};

export type AircallSpecialProperty = {
  id: number,
  label: string,
  value: string
};

export type AircallContactRead = {
  id: number,
  direct_link: string,
  first_name: string,
  last_name: string,
  company_name: string,
  information: string,
  is_shared: boolean,
  created_at: number,
  updated_at: number,
  emails: Array<AircallSpecialProperty>,
  phone_numbers: Array<AircallSpecialProperty>,
  urls: Array<AircallSpecialProperty>
};

export type AircallContactWrite = {
  id?: number,
  first_name?: string,
  last_name?: string,
  company_name?: string,
  information?: string,
  emails?: Array<AircallSpecialProperty>,
  phone_numbers?: Array<AircallSpecialProperty>,
  urls?: Array<AircallSpecialProperty>
};

export type AircallContactListMeta = {
  count: number,
  total: number,
  current_page: number,
  per_page: number,
  next_page_link?: string,
  previous_page_link?: string
};

export type AircallContactListResponse = {
  meta: AircallContactListMeta,
  contacts: Array<AircallContactRead>
};

export type AircallContactFieldDefinition = {
  id: string,
  label: string,
  in: boolean,
  out: boolean
};

export type AircallContactUpdateEnvelope = {
  message: HullUserUpdateMessage,
  hullUser: HullUser,
  aircallContactWrite: AircallContactWrite,
  aircallContactRead?: AircallContactRead,
  cachedAircallContactReadId?: string,
  skipReason?: string,
  error?: string
};

export type AircallMappingUtilSettings = {
  attributeMappings: AircallAttributesMapping
};

export type FilterUtilConfiguration = {
  synchronizedUserSegments: Array<string>
};

export type FilterResults<T> = {
  toSkip: Array<T>,
  toInsert: Array<T>,
  toUpdate: Array<T>,
  toDelete?: Array<T>
};

export type ServiceClientConfiguration = {
  baseApiUrl: string,
  hullMetric: HullMetrics,
  hullLogger: HullClientLogger,
  apiKey: string
};
