import { entryToCurl } from "./utils";
import { Entry } from "./types";

const baseEntry: Entry = {
  mock_id: undefined,
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
  expect(entryToCurl(entry)).toBe("curl -XGET '/test?foo=foo&bar=bar&bar=baz'");
});

test("GET history entry with body", () => {
  const entry: Entry = {
    ...baseEntry,
    request: {
      ...baseEntry.request,
      method: "POST",
      path: "/test",
      body: `{\n\t"key": "value containing 'single quotes'"\n}`,
    },
  };
  expect(entryToCurl(entry)).toBe(
    `curl -XPOST '/test' --data '{\n\t"key": "value containing \\'single quotes\\'"\n}'`
  );
});
