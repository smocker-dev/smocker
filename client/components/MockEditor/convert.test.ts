import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import mockSchema from "../../../docs/mock.schema.json";
import {
  MockEditorForm,
  MockEditorFormToMock,
  mockToEditorForm,
} from "./convert";
import { negativeMatchers, positiveMatchers } from "./utils";

// The mock JSON Schema is the source of truth for the mock format (also validated on the Go side).
// These tests assert the Visual Editor produces the expected mock AND that it validates against it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const schema = mockSchema as any;

const ajv = new Ajv2020({ strict: false, allErrors: true });
const validateMock: ValidateFunction = ajv.compile(schema);

// A mock produced by the form, as it is actually sent: undefined fields are dropped (like the
// YAML dump the editor does), so what we assert and validate is the effective payload.
const toMock = (form: MockEditorForm): Record<string, unknown> =>
  JSON.parse(JSON.stringify(MockEditorFormToMock(form)));

const expectValid = (mock: unknown) => {
  const valid = validateMock(mock);
  expect(
    valid,
    `schema errors: ${JSON.stringify(validateMock.errors, null, 2)}`,
  ).toBe(true);
};

const baseForm = (): MockEditorForm => ({
  request: {
    method: "GET",
    method_matcher: "ShouldEqual",
    path_matcher: "ShouldEqual",
    path: "/example",
    body_type: "json",
    body_txt_matcher: "ShouldEqual",
  },
  response_type: "static",
  response: { status: 200, delay_mode: "none" },
  dynamic_response: { engine: "go_template_yaml" },
  proxy: { delay_mode: "none" },
  context: { times_enabled: false },
});

describe("MockEditorFormToMock — request", () => {
  it("plain path uses a string shorthand", () => {
    const mock = toMock(baseForm());
    expect(mock.request).toMatchObject({ method: "GET", path: "/example" });
    expectValid(mock);
  });

  it("path with a matcher becomes { matcher, value }", () => {
    const form = baseForm();
    form.request.path_matcher = "ShouldMatch";
    form.request.path = "/api/.*";
    const mock = toMock(form);
    expect((mock.request as Record<string, unknown>).path).toEqual({
      matcher: "ShouldMatch",
      value: "/api/.*",
    });
    expectValid(mock);
  });

  it("method with a matcher becomes { matcher, value }", () => {
    const form = baseForm();
    form.request.method_matcher = "ShouldMatch";
    form.request.method = "GET|POST";
    const mock = toMock(form);
    expect((mock.request as Record<string, unknown>).method).toEqual({
      matcher: "ShouldMatch",
      value: "GET|POST",
    });
    expectValid(mock);
  });

  it("repeated query param / header keys become arrays (foo: [bar, baz])", () => {
    const form = baseForm();
    form.request.query_parameters = [
      { key: "foo", matcher: "ShouldEqual", value: "bar" },
      { key: "foo", matcher: "ShouldEqual", value: "baz" },
    ];
    form.request.headers = [
      { key: "X-A", matcher: "ShouldEqual", value: "1" },
      { key: "X-A", matcher: "ShouldContainSubstring", value: "2" },
    ];
    const mock = toMock(form);
    const req = mock.request as Record<string, unknown>;
    expect(req.query_params).toEqual({ foo: ["bar", "baz"] });
    expect(req.headers).toEqual({
      "X-A": ["1", { matcher: "ShouldContainSubstring", value: "2" }],
    });
    expectValid(mock);
  });

  it("query params and headers keep their matcher, dropping value for unary matchers", () => {
    const form = baseForm();
    form.request.query_parameters = [
      { key: "q", matcher: "ShouldEqual", value: "1" },
      { key: "opt", matcher: "ShouldBeEmpty", value: "ignored" },
    ];
    form.request.headers = [
      { key: "X-Trace", matcher: "ShouldContainSubstring", value: "abc" },
    ];
    const mock = toMock(form);
    const req = mock.request as Record<string, unknown>;
    expect(req.query_params).toEqual({
      q: "1",
      opt: { matcher: "ShouldBeEmpty" },
    });
    expect(req.headers).toEqual({
      "X-Trace": { matcher: "ShouldContainSubstring", value: "abc" },
    });
    expectValid(mock);
  });

  it("json body becomes a map of path -> matcher", () => {
    const form = baseForm();
    form.request.method = "POST";
    form.request.body_type = "json";
    form.request.body_json = [
      { key: "user.id", matcher: "ShouldEqual", value: "42" },
      { key: "user.name", matcher: "ShouldContainSubstring", value: "bob" },
    ];
    const mock = toMock(form);
    expect((mock.request as Record<string, unknown>).body).toEqual({
      "user.id": "42",
      "user.name": { matcher: "ShouldContainSubstring", value: "bob" },
    });
    expectValid(mock);
  });

  it("text body with a unary matcher omits the value", () => {
    const form = baseForm();
    form.request.method = "POST";
    form.request.body_type = "txt";
    form.request.body_txt_matcher = "ShouldNotBeEmpty";
    form.request.body_txt_value = "whatever";
    const mock = toMock(form);
    expect((mock.request as Record<string, unknown>).body).toEqual({
      matcher: "ShouldNotBeEmpty",
    });
    expectValid(mock);
  });

  it.each([
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
    "TRACE",
    "CONNECT",
  ])("accepts the %s method", (method) => {
    const form = baseForm();
    form.request.method = method;
    expectValid(toMock(form));
  });
});

describe("MockEditorFormToMock — response", () => {
  it("static response with headers and body", () => {
    const form = baseForm();
    form.response = {
      status: 201,
      body: '{"ok":true}',
      headers: [{ key: "Content-Type", value: "application/json" }],
      delay_mode: "none",
    };
    const mock = toMock(form);
    expect(mock.response).toMatchObject({
      status: 201,
      body: '{"ok":true}',
      headers: { "Content-Type": "application/json" },
    });
    expect(mock).not.toHaveProperty("dynamic_response");
    expect(mock).not.toHaveProperty("proxy");
    expectValid(mock);
  });

  it("fixed delay is a duration string", () => {
    const form = baseForm();
    form.response = { status: 200, delay_mode: "fixed", delay_value: "250ms" };
    const mock = toMock(form);
    expect((mock.response as Record<string, unknown>).delay).toBe("250ms");
    expectValid(mock);
  });

  it("random delay is a { min, max } object", () => {
    const form = baseForm();
    form.response = {
      status: 200,
      delay_mode: "random",
      delay_min: "100ms",
      delay_max: "2s",
    };
    const mock = toMock(form);
    expect((mock.response as Record<string, unknown>).delay).toEqual({
      min: "100ms",
      max: "2s",
    });
    expectValid(mock);
  });
});

describe("MockEditorFormToMock — dynamic response", () => {
  it.each(["go_template", "go_template_yaml", "go_template_json", "lua"])(
    "accepts the %s engine",
    (engine) => {
      const form = baseForm();
      form.response_type = "dynamic";
      form.dynamic_response = {
        engine: engine as NonNullable<
          MockEditorForm["dynamic_response"]
        >["engine"],
        script: "return {}",
      };
      const mock = toMock(form);
      expect(mock.dynamic_response).toEqual({ engine, script: "return {}" });
      expect(mock).not.toHaveProperty("response");
      expectValid(mock);
    },
  );
});

describe("MockEditorFormToMock — proxy", () => {
  it("proxy with host, headers, switches and a delay", () => {
    const form = baseForm();
    form.response_type = "proxy";
    form.proxy = {
      host: "https://example.com",
      headers: [{ key: "Authorization", value: "Bearer x" }],
      follow_redirect: true,
      skip_verify_tls: true,
      keep_host: true,
      delay_mode: "fixed",
      delay_value: "1s",
    };
    const mock = toMock(form);
    expect(mock.proxy).toMatchObject({
      host: "https://example.com",
      headers: { Authorization: "Bearer x" },
      follow_redirect: true,
      skip_verify_tls: true,
      keep_host: true,
      delay: "1s",
    });
    expect(mock).not.toHaveProperty("response");
    expectValid(mock);
  });
});

describe("MockEditorFormToMock — context", () => {
  it("times is emitted only when enabled", () => {
    const off = toMock(baseForm());
    expect(off).not.toHaveProperty("context");

    const form = baseForm();
    form.context = { times_enabled: true, times: 3 };
    const mock = toMock(form);
    expect(mock.context).toEqual({ times: 3 });
    expectValid(mock);
  });
});

describe("form completeness vs the JSON Schema", () => {
  it("offers exactly the matchers defined by the schema", () => {
    const schemaMatchers = new Set<string>(schema.$defs.matcherName.enum);
    const formMatchers = new Set<string>([
      ...positiveMatchers,
      ...negativeMatchers,
    ]);
    expect(formMatchers).toEqual(schemaMatchers);
  });

  it("every schema matcher produces a schema-valid mock through the form", () => {
    for (const matcher of schema.$defs.matcherName.enum as string[]) {
      const form = baseForm();
      form.request.query_parameters = [{ key: "k", matcher, value: "v" }];
      expectValid(toMock(form));
    }
  });

  it("supports every dynamic engine defined by the schema", () => {
    const engines = schema.$defs.dynamicResponse.properties.engine
      .enum as string[];
    for (const engine of engines) {
      const form = baseForm();
      form.response_type = "dynamic";
      form.dynamic_response = {
        engine: engine as NonNullable<
          MockEditorForm["dynamic_response"]
        >["engine"],
        script: "x",
      };
      expectValid(toMock(form));
    }
  });
});

describe("mockToEditorForm (YAML -> form round-trip)", () => {
  // Fully-specified mocks (method, path, status present) should survive form -> mock -> form
  // unchanged, proving the reverse conversion is the inverse of the forward one.
  const cases: Record<string, unknown>[] = [
    { request: { method: "GET", path: "/x" }, response: { status: 200 } },
    {
      request: {
        method: { matcher: "ShouldMatch", value: "GET|POST" },
        path: { matcher: "ShouldContainSubstring", value: "/api" },
      },
      response: {
        status: 201,
        body: "hi",
        headers: { "X-A": ["1", "2"] },
        delay: "10ms",
      },
    },
    {
      request: {
        method: "GET",
        path: "/x",
        query_params: {
          foo: ["bar", "baz"],
          q: { matcher: "ShouldMatch", value: "^a" },
        },
      },
      response: { status: 200, delay: { min: "1ms", max: "2s" } },
    },
    {
      request: {
        method: "POST",
        path: "/x",
        body: {
          "user.id": "42",
          "user.name": { matcher: "ShouldContainSubstring", value: "b" },
        },
      },
      response: { status: 200 },
    },
    {
      request: { method: "POST", path: "/x", body: "raw body" },
      response: { status: 200 },
    },
    {
      request: {
        method: "POST",
        path: "/x",
        body: { matcher: "ShouldContainSubstring", value: "abc" },
      },
      response: { status: 200 },
    },
    {
      request: { method: "GET", path: "/x" },
      dynamic_response: { engine: "lua", script: "return {}" },
    },
    {
      request: { method: "GET", path: "/x" },
      proxy: {
        host: "http://x",
        follow_redirect: true,
        headers: { A: "b" },
        delay: "1s",
      },
    },
    {
      request: { method: "GET", path: "/x" },
      response: { status: 200 },
      context: { times: 3 },
    },
  ];

  it.each(cases)("round-trips %#", (mock) => {
    expectValid(mock);
    const back = JSON.parse(
      JSON.stringify(MockEditorFormToMock(mockToEditorForm(mock)))
    );
    expect(back).toEqual(mock);
    expectValid(back);
  });
});
