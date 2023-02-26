import { z, ZodError, ZodIssueCode } from "zod";

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

const MultimapCodec = z.record(
  z.string(),
  z.union([z.string(), z.string().array()])
);
export type MultimapType = z.infer<typeof MultimapCodec>;

const MatcherCodec = z.object({
  matcher: z.string(),
  value: z.string()
});
export type MatcherType = z.infer<typeof MatcherCodec>;

const StringMatcherCodec = z.union([z.string(), MatcherCodec]);
export type StringMatcherType = z.infer<typeof StringMatcherCodec>;

const StringMatcherSliceCodec = StringMatcherCodec.array();
export type StringMatcherSliceType = z.infer<typeof StringMatcherSliceCodec>;

const StringMatcherMapCodec = z.record(z.string(), StringMatcherCodec);
export type StringMatcherMapType = z.infer<typeof StringMatcherMapCodec>;

const MultimapMatcherCodec = z.record(
  z.string(),
  z.union([StringMatcherCodec, StringMatcherSliceCodec])
);
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

const MockDynamicEngineCodec = z.union([
  z.literal("go_template"),
  z.literal("go_template_yaml"),
  z.literal("go_template_json"),
  z.literal("lua")
]);
export type MockDynamicEngineType = z.infer<typeof MockDynamicEngineCodec>;

const MockDynamicResponseCodec = z.object({
  engine: MockDynamicEngineCodec,
  script: z.string()
});
export type MockDynamicResponseType = z.infer<typeof MockDynamicResponseCodec>;

const MockProxyCodec = z.object({
  host: z.string(),
  follow_redirect: z.boolean().optional(),
  skip_verify_tls: z.boolean().optional(),
  keep_host: z.boolean().optional(),
  headers: MultimapCodec.optional()
});
export type MockProxyType = z.infer<typeof MockProxyCodec>;

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
  context: MockContextCodec.optional(),
  state: MockStateCodec.optional()
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

export const processError = (err: ZodError): string[] => {
  return err.issues.map(e => {
    const causes: string[] = [];
    if (e.code === ZodIssueCode.invalid_union) {
      e.unionErrors
        .flatMap(e => e.errors)
        .forEach(e => {
          causes.push(e.message.toLowerCase());
        });
    } else {
      causes.push(e.message.toLowerCase());
    }
    return `Error at [${e.path.join(".")}]: ${causes.join(" / ")}`;
  });
};

const trimMatcher = (matcher: StringMatcherType): StringMatcherType => {
  const m = asMatcher(matcher);
  if (m.matcher === defaultMatcher) {
    matcher = m.value;
  }
  return matcher;
};

const trimMatcherSlice = (
  matcher?: StringMatcherSliceType
): StringMatcherSliceType | undefined => {
  if (!matcher) {
    return matcher;
  }
  return matcher.map(m => trimMatcher(m));
};

const trimMatcherMap = (
  matcher?: StringMatcherMapType
): StringMatcherMapType | undefined => {
  if (!matcher) {
    return matcher;
  }
  if (!Object.keys(matcher).length) {
    return undefined;
  }
  const newMatcher: StringMatcherMapType = {};
  Object.entries(matcher).forEach(([key, value]) => {
    if (key != "") {
      newMatcher[key] = trimMatcher(value);
    }
  });
  return newMatcher;
};

const trimMatcherMultimap = (
  matcher?: MultimapMatcherType
): MultimapMatcherType | undefined => {
  if (!matcher) {
    return matcher;
  }

  const newMatcher: MultimapMatcherType = {};
  Object.entries(matcher).forEach(([key, value]) => {
    if (key != "") {
      const slice = trimMatcherSlice(asMatcherSlice(value));
      if (slice?.length) {
        if (slice?.length === 1) {
          newMatcher[key] = slice[0];
        } else {
          newMatcher[key] = slice;
        }
      }
    }
  });

  if (!Object.keys(newMatcher).length) {
    return undefined;
  }
  return newMatcher;
};

export const trimMultimap = (
  multimap?: MultimapType
): MultimapType | undefined => {
  if (!multimap) {
    return multimap;
  }

  const newMultimap: MultimapType = {};
  Object.entries(multimap).forEach(([key, value]) => {
    if (key != "") {
      const slice = asStringArray(value);
      if (slice?.length) {
        if (slice?.length === 1) {
          newMultimap[key] = slice[0];
        } else {
          newMultimap[key] = slice;
        }
      }
    }
  });

  if (!Object.keys(newMultimap).length) {
    return undefined;
  }
  return newMultimap;
};

const trimBodyMatcher = (
  matcher?: BodyMatcherType
): BodyMatcherType | undefined => {
  if (!matcher) {
    return matcher;
  }
  if (typeof matcher === "string" || "matcher" in matcher) {
    return trimMatcher(matcher as StringMatcherType);
  }
  return trimMatcherMap(matcher);
};

const trimRequest = (request: MockRequestType): MockRequestType => {
  request.method = trimMatcher(request.method);
  request.path = trimMatcher(request.path);
  request.query_params = trimMatcherMultimap(request.query_params);
  request.headers = trimMatcherMultimap(request.headers);
  request.body = trimBodyMatcher(request.body);
  return request;
};

const trimContext = (
  context?: MockContextType
): MockContextType | undefined => {
  if (!context || !context.times) {
    return undefined;
  }
  return context;
};

const trimStaticResponse = (
  response?: MockResponseType
): MockResponseType | undefined => {
  if (!response) {
    return undefined;
  }
  response.headers = trimMultimap(response.headers);
  return response;
};

const trimProxyResponse = (
  response?: MockProxyType
): MockProxyType | undefined => {
  if (!response) {
    return undefined;
  }
  response.headers = trimMultimap(response.headers);
  response.follow_redirect = Boolean(response.follow_redirect) || undefined;
  response.skip_verify_tls = Boolean(response.skip_verify_tls) || undefined;
  response.keep_host = Boolean(response.keep_host) || undefined;
  return response;
};

export const trimMock = (mock: MockType): MockType => {
  mock.request = trimRequest(mock.request);
  mock.context = trimContext(mock.context);
  mock.response = trimStaticResponse(mock.response);
  mock.proxy = trimProxyResponse(mock.proxy);
  return mock;
};

export const isStringMatcher = (body?: BodyMatcherType): boolean => {
  if (!body) {
    return false;
  }
  if (typeof body === "string") {
    return true;
  }
  if (body["matcher"]) {
    return true;
  }
  return false;
};

export const asMatcher = (matcher: StringMatcherType): MatcherType => {
  if (typeof matcher === "string") {
    return { matcher: defaultMatcher, value: matcher };
  }
  return matcher;
};

export const asMatcherSlice = (
  matcher: StringMatcherType | StringMatcherSliceType
): StringMatcherSliceType => {
  if (!Array.isArray(matcher)) {
    return [matcher];
  }
  return matcher;
};

export const asStringArray = (value: string | string[]): string[] => {
  if (typeof value === "string") {
    return [value];
  }
  return value;
};

export const bodyToString = (body?: BodyMatcherType): string => {
  if (!body) {
    return "";
  }
  if (typeof body === "string") {
    return body;
  }
  if (body["matcher"]) {
    return (body["value"] as string).trim();
  }
  return "";
};
