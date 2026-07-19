import { defaultMatcher } from "../../modules/types";
import { defaultResponseStatus, unaryMatchers } from "./utils";

interface KeyValueMatcher {
  key?: string;
  matcher: string;
  value?: string;
}

interface KeyValue {
  key?: string;
  value?: string;
}

type DelayMode = "none" | "fixed" | "random";

interface DelayFields {
  delay_mode?: DelayMode;
  delay_value?: string;
  delay_min?: string;
  delay_max?: string;
}

// Shape of the Visual Editor form (as seen in antd's onValuesChange callback).
export interface MockEditorForm {
  request: {
    method: string;
    method_matcher: string;
    path_matcher: string;
    path: string;
    query_parameters?: KeyValueMatcher[];
    headers?: KeyValueMatcher[];
    body_type: "json" | "txt";
    body_json?: KeyValueMatcher[];
    body_txt_matcher: string;
    body_txt_value?: string;
  };
  response_type: "static" | "dynamic" | "proxy";
  response?: {
    status: number;
    headers?: KeyValue[];
    body?: string;
  } & DelayFields;
  dynamic_response?: {
    engine: "go_template" | "go_template_yaml" | "go_template_json" | "lua";
    script?: string;
  };
  proxy?: {
    host?: string;
    headers?: KeyValue[];
    follow_redirect?: boolean;
    skip_verify_tls?: boolean;
    keep_host?: boolean;
  } & DelayFields;
  context?: {
    times_enabled: boolean;
    times?: number;
  };
}

// Builds the mock `delay` field from the delay sub-form: a plain duration string when fixed,
// a { min, max } object when random, or nothing when disabled.
const buildDelay = (d: DelayFields | undefined): unknown => {
  if (!d || d.delay_mode === "none" || !d.delay_mode) {
    return undefined;
  }
  if (d.delay_mode === "random") {
    return { min: d.delay_min || "0", max: d.delay_max || "0" };
  }
  return d.delay_value || undefined;
};

// A string matcher: the plain value for the default matcher, or a { matcher, value } object
// (value dropped for unary matchers like ShouldBeEmpty).
const toStringMatcher = (
  matcher: string,
  value: string | undefined,
): unknown => {
  if (matcher === defaultMatcher) {
    return value;
  }
  if (unaryMatchers.includes(matcher)) {
    return { matcher };
  }
  return { matcher, value };
};

// Accumulates a key/value into a multimap, turning repeated keys into an array (foo: [a, b]).
const addToMultimap = (
  acc: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> => {
  if (key in acc) {
    const current = acc[key];
    return {
      ...acc,
      [key]: Array.isArray(current) ? [...current, value] : [current, value],
    };
  }
  return { ...acc, [key]: value };
};

// Multimap of matchers (query params, request headers): repeated keys become arrays.
const toMatcherMultimap = (items: KeyValueMatcher[]): Record<string, unknown> =>
  items
    .filter((item) =>
      unaryMatchers.includes(item.matcher) ? item.key : item.key && item.value,
    )
    .reduce(
      (acc, item) =>
        addToMultimap(
          acc,
          item.key ?? "",
          toStringMatcher(item.matcher, item.value),
        ),
      {} as Record<string, unknown>,
    );

// Plain multimap of strings (response/proxy headers): repeated keys become arrays.
const toStringMultimap = (items: KeyValue[]): Record<string, unknown> =>
  items
    .filter((item) => item.key && item.value)
    .reduce(
      (acc, item) => addToMultimap(acc, item.key ?? "", item.value),
      {} as Record<string, unknown>,
    );

// Body matcher map (JSON path -> matcher): paths are unique, no array aggregation.
const toBodyMatcherMap = (items: KeyValueMatcher[]): Record<string, unknown> =>
  items
    .filter((item) =>
      unaryMatchers.includes(item.matcher) ? item.key : item.key && item.value,
    )
    .reduce(
      (acc, item) => ({
        ...acc,
        [item.key ?? ""]: toStringMatcher(item.matcher, item.value),
      }),
      {} as Record<string, unknown>,
    );

const nonEmpty = (
  map: Record<string, unknown>,
): Record<string, unknown> | undefined =>
  Object.keys(map).length > 0 ? map : undefined;

// Translates the Visual Editor form into a mock object matching the persisted mock format
// (docs/mock.schema.json). Fields left as `undefined` are dropped when serialized to YAML/JSON.
export const MockEditorFormToMock = (
  mockEditorForm: MockEditorForm,
): unknown => {
  const req = mockEditorForm.request;

  let requestBody;
  if (req?.body_type === "json") {
    requestBody = nonEmpty(toBodyMatcherMap(req.body_json ?? []));
  } else if (req?.body_type === "txt") {
    requestBody = toStringMatcher(req.body_txt_matcher, req.body_txt_value);
  }

  return {
    request: {
      method: toStringMatcher(req.method_matcher, req.method),
      path: toStringMatcher(req.path_matcher, req.path),
      query_params: nonEmpty(toMatcherMultimap(req.query_parameters ?? [])),
      headers: nonEmpty(toMatcherMultimap(req.headers ?? [])),
      body: requestBody,
    },

    context: mockEditorForm.context?.times_enabled
      ? {
          times: mockEditorForm.context?.times,
        }
      : undefined,

    response:
      mockEditorForm.response_type === "static"
        ? {
            status: mockEditorForm?.response?.status,
            body: mockEditorForm?.response?.body,
            headers: nonEmpty(
              toStringMultimap(mockEditorForm.response?.headers ?? []),
            ),
            delay: buildDelay(mockEditorForm.response),
          }
        : undefined,

    dynamic_response:
      mockEditorForm.response_type === "dynamic"
        ? {
            engine: mockEditorForm?.dynamic_response?.engine,
            script: mockEditorForm?.dynamic_response?.script,
          }
        : undefined,

    proxy:
      mockEditorForm.response_type === "proxy"
        ? {
            host: mockEditorForm?.proxy?.host,
            headers: nonEmpty(
              toStringMultimap(mockEditorForm.proxy?.headers ?? []),
            ),
            follow_redirect:
              Boolean(mockEditorForm.proxy?.follow_redirect) || undefined,
            skip_verify_tls:
              Boolean(mockEditorForm.proxy?.skip_verify_tls) || undefined,
            keep_host: Boolean(mockEditorForm.proxy?.keep_host) || undefined,
            delay: buildDelay(mockEditorForm.proxy),
          }
        : undefined,
  };
};

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

const asString = (v: unknown): string | undefined =>
  v === undefined || v === null ? undefined : String(v);

// Parses a string matcher (a plain value or a { matcher, value } object) into an editor pair.
const parseStringMatcher = (
  v: unknown,
): { matcher: string; value?: string } => {
  if (v && typeof v === "object" && !Array.isArray(v) && "matcher" in v) {
    const o = v as { matcher?: unknown; value?: unknown };
    return {
      matcher: String(o.matcher ?? defaultMatcher),
      value: asString(o.value),
    };
  }
  return { matcher: defaultMatcher, value: asString(v) };
};

// A body object that is a whole-body matcher ({ matcher, value }) rather than a path->matcher map.
const isWholeBodyMatcher = (v: unknown): boolean =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  "matcher" in v &&
  Object.keys(v).every((k) => k === "matcher" || k === "value");

// Reverses a matcher multimap ({ key: value | { matcher, value } | [...] }) into editor rows,
// one row per value (arrays are expanded so repeated keys round-trip).
const toMatcherRows = (multimap: unknown): KeyValueMatcher[] => {
  const rows: KeyValueMatcher[] = [];
  for (const [key, val] of Object.entries(asRecord(multimap))) {
    for (const v of Array.isArray(val) ? val : [val]) {
      const { matcher, value } = parseStringMatcher(v);
      rows.push({ key, matcher, value });
    }
  }
  return rows;
};

const toKeyValueRows = (multimap: unknown): KeyValue[] => {
  const rows: KeyValue[] = [];
  for (const [key, val] of Object.entries(asRecord(multimap))) {
    for (const v of Array.isArray(val) ? val : [val]) {
      rows.push({ key, value: asString(v) });
    }
  }
  return rows;
};

const parseDelay = (d: unknown): DelayFields => {
  if (d === undefined || d === null) {
    return { delay_mode: "none" };
  }
  if (typeof d === "object") {
    const o = d as { min?: unknown; max?: unknown };
    return {
      delay_mode: "random",
      delay_min: asString(o.min) ?? "",
      delay_max: asString(o.max) ?? "",
    };
  }
  return { delay_mode: "fixed", delay_value: asString(d) };
};

// Reverse of MockEditorFormToMock: hydrates the Visual Editor form from a mock object (e.g. parsed
// from the Raw YAML editor). Assumes the mock is valid against docs/mock.schema.json.
export const mockToEditorForm = (mock: unknown): MockEditorForm => {
  const m = asRecord(mock);
  const request = asRecord(m.request);
  const method = parseStringMatcher(request.method);
  const path = parseStringMatcher(request.path);

  let bodyType: "json" | "txt" = "json";
  let bodyJson: KeyValueMatcher[] | undefined;
  let bodyTxtMatcher = defaultMatcher;
  let bodyTxtValue: string | undefined;
  const body = request.body;
  if (typeof body === "string") {
    bodyType = "txt";
    bodyTxtValue = body;
  } else if (isWholeBodyMatcher(body)) {
    const o = body as { matcher?: unknown; value?: unknown };
    bodyType = "txt";
    bodyTxtMatcher = String(o.matcher ?? defaultMatcher);
    bodyTxtValue = asString(o.value);
  } else if (body && typeof body === "object") {
    bodyType = "json";
    bodyJson = toMatcherRows(body);
  }

  const responseType: MockEditorForm["response_type"] = m.proxy
    ? "proxy"
    : m.dynamic_response
      ? "dynamic"
      : "static";

  const resp = asRecord(m.response);
  const dyn = asRecord(m.dynamic_response);
  const prox = asRecord(m.proxy);
  const ctx = asRecord(m.context);
  const hasTimes = ctx.times !== undefined && ctx.times !== null;

  return {
    request: {
      method: method.value ?? "GET",
      method_matcher: method.matcher,
      path: path.value ?? "",
      path_matcher: path.matcher,
      query_parameters: toMatcherRows(request.query_params),
      headers: toMatcherRows(request.headers),
      body_type: bodyType,
      body_json: bodyJson,
      body_txt_matcher: bodyTxtMatcher,
      body_txt_value: bodyTxtValue,
    },
    response_type: responseType,
    response: {
      status:
        typeof resp.status === "number" ? resp.status : defaultResponseStatus,
      body: asString(resp.body),
      headers: toKeyValueRows(resp.headers),
      ...parseDelay(resp.delay),
    },
    dynamic_response: {
      engine:
        (dyn.engine as NonNullable<
          MockEditorForm["dynamic_response"]
        >["engine"]) ?? "go_template_yaml",
      script: asString(dyn.script),
    },
    proxy: {
      host: asString(prox.host),
      headers: toKeyValueRows(prox.headers),
      follow_redirect: Boolean(prox.follow_redirect),
      skip_verify_tls: Boolean(prox.skip_verify_tls),
      keep_host: Boolean(prox.keep_host),
      ...parseDelay(prox.delay),
    },
    context: {
      times_enabled: hasTimes,
      times: hasTimes ? Number(ctx.times) : 1,
    },
  };
};
