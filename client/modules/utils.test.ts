import { Entry } from "./types";
import { entryToCurl } from "./utils";

const baseEntry: Entry = {
  context: {
    mock_id: "",
    mock_type: "",
    delay: "",
  },
  request: {
    method: "",
    path: "",
    query_params: undefined,
    headers: undefined,
    body: undefined,
    date: "",
  },
  response: {
    status: 0,
    headers: undefined,
    body: undefined,
    date: "",
  },
};

describe("Generate curl command from:", () => {
  test("GET history entry", () => {
    const entry: Entry = {
      ...baseEntry,
      request: {
        ...baseEntry.request,
        method: "GET",
        path: "/test",
      },
    };
    expect(entryToCurl(entry)).toBe("curl -XGET '/test'");
  });

  test("GET history entry with Host header", () => {
    const entry: Entry = {
      ...baseEntry,
      request: {
        ...baseEntry.request,
        method: "GET",
        path: "/test",
        headers: {
          Host: ["localhost:8080"],
        },
      },
    };
    expect(entryToCurl(entry)).toBe("curl -XGET 'localhost:8080/test'");
  });

  test("GET history entry with headers", () => {
    const entry: Entry = {
      ...baseEntry,
      request: {
        ...baseEntry.request,
        method: "GET",
        path: "/test",
        headers: {
          "X-Foo-Header": ["foo"],
          "X-Bar-Header": ["bar", "baz"],
        },
      },
    };
    expect(entryToCurl(entry)).toBe(
      "curl -XGET --header 'X-Foo-Header: foo' --header 'X-Bar-Header: bar' --header 'X-Bar-Header: baz' '/test'"
    );
  });

  test("GET history entry with query parameters", () => {
    const entry: Entry = {
      ...baseEntry,
      request: {
        ...baseEntry.request,
        method: "GET",
        path: "/test",
        query_params: {
          foo: ["foo"],
          bar: ["bar", "baz"],
        },
      },
    };
    expect(entryToCurl(entry)).toBe(
      "curl -XGET '/test?foo=foo&bar=bar&bar=baz'"
    );
  });

  test("GET history entry with body JSON", () => {
    const entry: Entry = {
      ...baseEntry,
      request: {
        ...baseEntry.request,
        method: "POST",
        path: "/test",
        body: {
          key: "value containing 'single quotes'",
        },
      },
    };
    expect(entryToCurl(entry)).toBe(
      `curl -XPOST '/test' --data '{"key":"value containing \\'single quotes\\'"}'`
    );
  });

  test("GET history entry with body string", () => {
    const entry: Entry = {
      ...baseEntry,
      request: {
        ...baseEntry.request,
        method: "POST",
        path: "/test",
        body: "value containing 'single quotes'",
      },
    };
    expect(entryToCurl(entry)).toBe(
      // FIXME: we shouldn't have the " if the client sent raw text
      `curl -XPOST '/test' --data '"value containing \\'single quotes\\'"'`
    );
  });
});
