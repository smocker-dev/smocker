import { z } from "zod";

export const dateFormat = "ddd, D MMM YYYY HH:mm:ss.SSS";
export const defaultMatcher = "ShouldEqual";

export const ErrorCodec = z.object({
  message: z.string().optional()
});
export type ErrorType = z.infer<typeof ErrorCodec>;

export const SessionCodec = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string()
});
export type SessionType = z.infer<typeof SessionCodec>;

export const SessionsCodec = SessionCodec.array();
export type SessionsType = z.infer<typeof SessionsCodec>;

const MultimapCodec = z.record(z.string(), z.string().array());
export type MultimapType = z.infer<typeof MultimapCodec>;

const StringMatcherCodec = z.object({
  matcher: z.string(),
  value: z.string()
});
export type StringMatcherType = z.infer<typeof StringMatcherCodec>;

const StringMatcherSliceCodec = StringMatcherCodec.array();
export type StringMatcherSliceType = z.infer<typeof StringMatcherSliceCodec>;

const StringMatcherMapCodec = z.record(z.string(), StringMatcherCodec);
export type StringMatcherMapType = z.infer<typeof StringMatcherMapCodec>;

const MultimapMatcherCodec = z.record(z.string(), StringMatcherSliceCodec);
export type MultimapMatcherType = z.infer<typeof MultimapMatcherCodec>;

const BodyMatcherCodec = z.union([StringMatcherCodec, StringMatcherMapCodec]);
export type BodyMatcherType = z.infer<typeof BodyMatcherCodec>;

const EntryContextCodec = z.object({
  mock_id: z.string().optional(),
  mock_type: z.string().optional(),
  delay: z.string().optional()
});
export type EntryContextType = z.infer<typeof EntryContextCodec>;

const EntryRequestCodec = z.object({
  path: z.string(),
  method: z.string(),
  body: z.unknown().optional(),
  query_params: MultimapCodec.optional(),
  headers: MultimapCodec.optional(),
  date: z.string()
});
export type EntryRequestType = z.infer<typeof EntryRequestCodec>;

const EntryResponseCodec = z.object({
  status: z.number(),
  body: z.unknown(),
  headers: MultimapCodec.optional(),
  date: z.string()
});
export type EntryResponseType = z.infer<typeof EntryResponseCodec>;

const EntryCodec = z.object({
  context: EntryContextCodec,
  request: EntryRequestCodec,
  response: EntryResponseCodec
});
export type EntryType = z.infer<typeof EntryCodec>;

export const HistoryCodec = EntryCodec.array();
export type HistoryType = z.infer<typeof HistoryCodec>;

const MockRequestCodec = z.object({
  path: StringMatcherCodec,
  method: StringMatcherCodec,
  body: BodyMatcherCodec.optional(),
  query_params: MultimapMatcherCodec.optional(),
  headers: MultimapMatcherCodec.optional()
});
export type MockRequestType = z.infer<typeof MockRequestCodec>;

const MockResponseCodec = z.object({
  status: z.number(),
  body: z.unknown().optional(),
  headers: MultimapCodec.optional()
});
export type MockResponseType = z.infer<typeof MockResponseCodec>;

const MockDynamicResponseCodec = z.object({
  engine: z.union([
    z.literal("go_template"),
    z.literal("go_template_yaml"),
    z.literal("go_template_json"),
    z.literal("lua")
  ]),
  script: z.string()
});
export type MockDynamicResponseType = z.infer<typeof MockDynamicResponseCodec>;

const MockProxyCodec = z.object({
  host: z.string()
});
export type MockProxy = z.infer<typeof MockProxyCodec>;

const MockContextCodec = z.object({
  times: z.number().optional()
});
export type MockContextType = z.infer<typeof MockContextCodec>;

const MockStateCodec = z.object({
  times_count: z.number(),
  creation_date: z.string(),
  id: z.string(),
  locked: z.boolean()
});
export type MockStateType = z.infer<typeof MockStateCodec>;

const MockCodec = z.object({
  request: MockRequestCodec,
  response: MockResponseCodec.optional(),
  dynamic_response: MockDynamicResponseCodec.optional(),
  proxy: MockProxyCodec.optional(),
  context: MockContextCodec,
  state: MockStateCodec
});
export type MockType = z.infer<typeof MockCodec>;

export const MocksCodec = MockCodec.array();
export type MocksType = z.infer<typeof MocksCodec>;

const GraphEntryCodec = z.object({
  type: z.string(),
  message: z.string(),
  from: z.string(),
  to: z.string(),
  date: z.string()
});
export type GraphEntryType = z.infer<typeof GraphEntryCodec>;

export const GraphHistoryCodec = z.array(GraphEntryCodec);
export type GraphHistoryType = z.infer<typeof GraphHistoryCodec>;
