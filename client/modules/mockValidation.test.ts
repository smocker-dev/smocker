import { describe, expect, it } from "vitest";
import {
  parseYamlForVisualEditor,
  validateMocksForSave,
} from "./mockValidation";

describe("parseYamlForVisualEditor", () => {
  it("accepts a single valid mock (array form) and returns the editor form", () => {
    const res = parseYamlForVisualEditor(
      "[{request: {method: PUT, path: /x}, response: {status: 201}}]"
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.form.request.method).toBe("PUT");
      expect(res.form.request.path).toBe("/x");
      expect(res.form.response_type).toBe("static");
      expect(res.form.response?.status).toBe(201);
    }
  });

  it("accepts a single valid mock (bare object, not wrapped in a list)", () => {
    const res = parseYamlForVisualEditor(
      "request:\n  path: /x\nresponse:\n  status: 200\n"
    );
    expect(res.ok).toBe(true);
  });

  it("rejects an empty document", () => {
    expect(parseYamlForVisualEditor("   ").ok).toBe(false);
  });

  it("rejects invalid YAML syntax", () => {
    const res = parseYamlForVisualEditor("[{request: {path: }");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/YAML/i);
    }
  });

  it("rejects a mock that violates the schema (no response/dynamic_response/proxy)", () => {
    const res = parseYamlForVisualEditor("[{request: {path: /x}}]");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/response|dynamic_response|proxy|required/i);
    }
  });

  it("rejects an unknown matcher", () => {
    const res = parseYamlForVisualEditor(
      "[{request: {path: {matcher: Nope, value: /x}}, response: {status: 200}}]"
    );
    expect(res.ok).toBe(false);
  });

  it("points at response.body when it is a map instead of a string", () => {
    const res = parseYamlForVisualEditor(
      "[{request: {path: /x}, response: {status: 200, body: {message: test}}}]"
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/response\.body/);
      expect(res.error).toMatch(/string/);
    }
  });

  it("refuses to switch when there are several mocks", () => {
    const res = parseYamlForVisualEditor(
      "[{request: {path: /a}, response: {status: 200}}, {request: {path: /b}, response: {status: 200}}]"
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/single mock/i);
    }
  });
});

describe("validateMocksForSave", () => {
  it("accepts a single valid mock", () => {
    expect(
      validateMocksForSave("[{request: {path: /x}, response: {status: 200}}]")
        .ok
    ).toBe(true);
  });

  it("accepts several valid mocks (the raw editor may hold a list)", () => {
    const res = validateMocksForSave(
      "[{request: {path: /a}, response: {status: 200}}, {request: {path: /b}, proxy: {host: http://x}}]"
    );
    expect(res.ok).toBe(true);
  });

  it("rejects an empty document", () => {
    expect(validateMocksForSave("  ").ok).toBe(false);
  });

  it("rejects invalid YAML", () => {
    expect(validateMocksForSave("[{request:").ok).toBe(false);
  });

  it("reports which mock is invalid and why", () => {
    const res = validateMocksForSave(
      "[{request: {path: /a}, response: {status: 200}}, {request: {path: /b}, response: {status: 200, body: {x: 1}}}]"
    );
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/mock #2/);
      expect(res.error).toMatch(/response\.body/);
      expect(res.error).toMatch(/string/);
    }
  });
});
