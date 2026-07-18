import { z } from "zod";

export const dateFormat = "ddd, D MMM YYYY HH:mm:ss.SSS";
export const defaultMatcher = "ShouldEqual";

export const ErrorSchema = z.object({
  message: z.string().optional(),
});
export type SmockerError = z.infer<typeof ErrorSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
});
export type Session = z.infer<typeof SessionSchema>;

export const SessionsSchema = z.array(SessionSchema);
export type Sessions = z.infer<typeof SessionsSchema>;

const MultimapSchema = z.record(z.string(), z.array(z.string()));
export type Multimap = z.infer<typeof MultimapSchema>;

const StringMatcherSchema = z.object({
  matcher: z.string(),
  value: z.string(),
});
export type StringMatcher = z.infer<typeof StringMatcherSchema>;

const StringMatcherSliceSchema = z.array(StringMatcherSchema);
export type StringMatcherSlice = z.infer<typeof StringMatcherSliceSchema>;

const StringMatcherMapSchema = z.record(z.string(), StringMatcherSchema);
export type StringMatcherMap = z.infer<typeof StringMatcherMapSchema>;

const MultimapMatcherSchema = z.record(z.string(), StringMatcherSliceSchema);
export type MultimapMatcher = z.infer<typeof MultimapMatcherSchema>;

const BodyMatcherSchema = z.union([
  StringMatcherSchema,
  StringMatcherMapSchema,
]);
export type BodyMatcher = z.infer<typeof BodyMatcherSchema>;

const EntryContextSchema = z.object({
  mock_id: z.string().optional(),
  mock_type: z.string().optional(),
  delay: z.string().optional(),
});
export type EntryContext = z.infer<typeof EntryContextSchema>;

const EntryRequestSchema = z.object({
  path: z.string(),
  method: z.string(),
  body: z.unknown().optional(),
  query_params: MultimapSchema.optional(),
  headers: MultimapSchema.optional(),
  date: z.string(),
});
export type EntryRequest = z.infer<typeof EntryRequestSchema>;

const EntryResponseSchema = z.object({
  status: z.number(),
  body: z.unknown().optional(),
  headers: MultimapSchema.optional(),
  date: z.string(),
});
export type EntryResponse = z.infer<typeof EntryResponseSchema>;

const EntrySchema = z.object({
  context: EntryContextSchema,
  request: EntryRequestSchema,
  response: EntryResponseSchema,
});
export type Entry = z.infer<typeof EntrySchema>;

export const HistorySchema = z.array(EntrySchema);
export type History = z.infer<typeof HistorySchema>;

const MockRequestSchema = z.object({
  path: StringMatcherSchema,
  method: StringMatcherSchema,
  body: BodyMatcherSchema.optional(),
  query_params: MultimapMatcherSchema.optional(),
  headers: MultimapMatcherSchema.optional(),
});
export type MockRequest = z.infer<typeof MockRequestSchema>;

const MockResponseSchema = z.object({
  status: z.number(),
  body: z.unknown().optional(),
  headers: MultimapSchema.optional(),
});
export type MockResponse = z.infer<typeof MockResponseSchema>;

const MockDynamicResponseSchema = z.object({
  engine: z.enum([
    "go_template",
    "go_template_yaml",
    "go_template_json",
    "lua",
  ]),
  script: z.string(),
});
export type MockDynamicResponse = z.infer<typeof MockDynamicResponseSchema>;

const MockProxySchema = z.object({
  host: z.string(),
});
export type MockProxy = z.infer<typeof MockProxySchema>;

const MockContextSchema = z.object({
  times: z.number().optional(),
});
export type MockContext = z.infer<typeof MockContextSchema>;

const MockStateSchema = z.object({
  times_count: z.number(),
  creation_date: z.string(),
  id: z.string(),
  locked: z.boolean(),
});
export type MockState = z.infer<typeof MockStateSchema>;

const MockSchema = z.object({
  request: MockRequestSchema,
  response: MockResponseSchema.optional(),
  dynamic_response: MockDynamicResponseSchema.optional(),
  proxy: MockProxySchema.optional(),
  context: MockContextSchema,
  state: MockStateSchema,
});
export type Mock = z.infer<typeof MockSchema>;

export const MocksSchema = z.array(MockSchema);
export type Mocks = z.infer<typeof MocksSchema>;

const GraphEntrySchema = z.object({
  type: z.string(),
  message: z.string(),
  from: z.string(),
  to: z.string(),
  date: z.string(),
});
export type GraphEntry = z.infer<typeof GraphEntrySchema>;

export const GraphHistorySchema = z.array(GraphEntrySchema);
export type GraphHistory = z.infer<typeof GraphHistorySchema>;
