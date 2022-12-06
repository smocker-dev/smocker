import { describe, expect, it } from "vitest";
import { EntryRequestType } from "./types";
import { requestToCurl } from "./utils";

const baseRequest: EntryRequestType = {
  method: "",
  path: "",
  query_params: undefined,
  headers: undefined,
  body: undefined,
  date: ""
};

describe("Generate curl command from:", () => {
  it("GET history request", () => {
    const request: EntryRequestType = {
      ...baseRequest,
      method: "GET",
      path: "/test"
    };
    expect(requestToCurl(request)).toBe("curl -XGET '/test'");
  });

  it("GET history request with Host header", () => {
    const request: EntryRequestType = {
      ...baseRequest,
      method: "GET",
      path: "/test",
      headers: {
        Host: ["localhost:8080"]
      }
    };
    expect(requestToCurl(request)).toBe("curl -XGET 'localhost:8080/test'");
  });

  it("GET history request with headers", () => {
    const request: EntryRequestType = {
      ...baseRequest,
      method: "GET",
      path: "/test",
      headers: {
        "X-Foo-Header": ["foo"],
        "X-Bar-Header": ["bar", "baz"]
      }
    };
    expect(requestToCurl(request)).toBe(
      "curl -XGET --header 'X-Foo-Header: foo' --header 'X-Bar-Header: bar' --header 'X-Bar-Header: baz' '/test'"
    );
  });

  it("GET history request with query parameters", () => {
    const request: EntryRequestType = {
      ...baseRequest,
      method: "GET",
      path: "/test",
      query_params: {
        foo: ["foo"],
        bar: ["bar", "baz"]
      }
    };
    expect(requestToCurl(request)).toBe(
      "curl -XGET '/test?foo=foo&bar=bar&bar=baz'"
    );
  });

  it("GET history request with body JSON", () => {
    const request: EntryRequestType = {
      ...baseRequest,
      method: "POST",
      path: "/test",
      body: {
        key: "value containing 'single quotes'"
      }
    };
    expect(requestToCurl(request)).toBe(
      `curl -XPOST '/test' --data '{"key":"value containing \\'single quotes\\'"}'`
    );
  });

  it("GET history request with body string", () => {
    const request: EntryRequestType = {
      ...baseRequest,
      method: "POST",
      path: "/test",
      body: "value containing 'single quotes'"
    };
    expect(requestToCurl(request)).toBe(
      // FIXME: we shouldn't have the " if the client sent raw text
      `curl -XPOST '/test' --data '"value containing \\'single quotes\\'"'`
    );
  });
});
