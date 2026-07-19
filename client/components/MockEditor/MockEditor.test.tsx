import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";
import { load } from "js-yaml";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockSchema from "../../../docs/mock.schema.json";
import MockEditor from "./MockEditor";

// CodeMirror does not render under jsdom, and the form only needs a value/onChange contract from
// it, so stand it in with a plain textarea. This lets us render the real MockEditor and exercise
// its field wiring (Form.Item names, sub-editors, delay controls) end to end.
vi.mock("../Code", async () => {
  const React = await import("react");
  return {
    default: ({
      value,
      onChange,
    }: {
      value?: string;
      onChange?: (v: string) => void;
    }) =>
      React.createElement("textarea", {
        value: value ?? "",
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
          onChange?.(e.target.value),
      }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const schema = mockSchema as any;
const ajv = new Ajv2020({ strict: false, allErrors: true });
const validateMock: ValidateFunction = ajv.compile(schema);

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  }));
});

// Renders MockEditor and exposes the latest mock it emits (it calls onChange with a YAML array
// on every change), validating that mock against the schema as we read it.
const setup = () => {
  const onChange = vi.fn();
  const { container } = render(<MockEditor onChange={onChange} />);
  const lastMock = (): Record<string, unknown> => {
    const calls = onChange.mock.calls;
    expect(calls.length, "MockEditor never emitted a mock").toBeGreaterThan(0);
    const doc = load(calls[calls.length - 1][0] as string) as unknown[];
    const mock = doc[0];
    expect(
      validateMock(mock),
      `schema errors: ${JSON.stringify(validateMock.errors, null, 2)}`,
    ).toBe(true);
    return mock as Record<string, unknown>;
  };
  const byId = <T extends Element = HTMLElement>(id: string): T => {
    const el = container.querySelector<T>(`#${id}`);
    if (!el) {
      throw new Error(`element #${id} not found`);
    }
    return el;
  };
  return { onChange, container, lastMock, byId };
};

describe("<MockEditor /> wiring", () => {
  it("emits the request path typed in the endpoint field", async () => {
    // antd hides the real radio inputs (pointer-events: none) behind styled labels; disable the
    // pointer-events guard so we can drive the inputs directly by value.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { byId, lastMock } = setup();
    await user.type(byId<HTMLInputElement>("request_path"), "/hello");
    expect(lastMock().request).toMatchObject({ method: "GET", path: "/hello" });
  });

  it("wires a fixed response delay through the delay control", async () => {
    // antd hides the real radio inputs (pointer-events: none) behind styled labels; disable the
    // pointer-events guard so we can drive the inputs directly by value.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { container, byId, lastMock } = setup();
    await user.type(byId<HTMLInputElement>("request_path"), "/d");
    await user.click(
      container.querySelector('#response_delay_mode input[value="fixed"]')!,
    );
    await user.type(byId<HTMLInputElement>("response_delay_value"), "300ms");
    expect((lastMock().response as Record<string, unknown>).delay).toBe(
      "300ms",
    );
  });

  it("wires proxy host and a random delay", async () => {
    // antd hides the real radio inputs (pointer-events: none) behind styled labels; disable the
    // pointer-events guard so we can drive the inputs directly by value.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { container, byId, lastMock } = setup();
    await user.click(
      container.querySelector('#response_type input[value="proxy"]')!,
    );
    await user.type(
      byId<HTMLInputElement>("proxy_host"),
      "https://example.com",
    );
    await user.click(
      container.querySelector('#proxy_delay_mode input[value="random"]')!,
    );
    await user.type(byId<HTMLInputElement>("proxy_delay_min"), "100ms");
    await user.type(byId<HTMLInputElement>("proxy_delay_max"), "2s");
    const mock = lastMock();
    expect(mock.proxy).toMatchObject({
      host: "https://example.com",
      delay: { min: "100ms", max: "2s" },
    });
    expect(mock).not.toHaveProperty("response");
  });

  it("wires the context times limit", async () => {
    // antd hides the real radio inputs (pointer-events: none) behind styled labels; disable the
    // pointer-events guard so we can drive the inputs directly by value.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { byId, lastMock } = setup();
    await user.type(byId<HTMLInputElement>("request_path"), "/c");
    await user.click(byId("context_times_enabled"));
    const times = byId<HTMLInputElement>("context_times");
    await user.clear(times);
    await user.type(times, "5");
    expect(lastMock().context).toEqual({ times: 5 });
  });
});
