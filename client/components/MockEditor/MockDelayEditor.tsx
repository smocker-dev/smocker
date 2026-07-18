import * as React from "react";
import { Form, Input, Radio } from "antd";

// Response/proxy delay: none, a fixed duration (e.g. "200ms"), or a random range between min and
// max. `prefix` is the parent field path (["response"] or ["proxy"]).
export const MockDelayEditor = ({
  prefix,
}: {
  prefix: string[];
}): React.JSX.Element => (
  <div className="inline-form-items">
    <span style={{ paddingRight: "0.5em" }}>Delay:</span>
    <Form.Item name={[...prefix, "delay_mode"]} noStyle>
      <Radio.Group
        size="small"
        optionType="button"
        options={[
          { label: "None", value: "none" },
          { label: "Fixed", value: "fixed" },
          { label: "Random", value: "random" },
        ]}
      />
    </Form.Item>
    <Form.Item
      noStyle
      shouldUpdate={(prev, cur) => {
        const at = (v: Record<string, unknown>) =>
          prefix.reduce<unknown>(
            (acc, k) => (acc as Record<string, unknown>)?.[k],
            v,
          );
        return (
          (at(prev) as { delay_mode?: string })?.delay_mode !==
          (at(cur) as { delay_mode?: string })?.delay_mode
        );
      }}
    >
      {({ getFieldValue }) => {
        const mode = getFieldValue([...prefix, "delay_mode"]) ?? "none";
        if (mode === "fixed") {
          return (
            <Form.Item name={[...prefix, "delay_value"]} noStyle>
              <Input
                size="small"
                placeholder="e.g. 200ms, 1s"
                style={{ width: 160, marginLeft: "0.5em" }}
              />
            </Form.Item>
          );
        }
        if (mode === "random") {
          return (
            <span style={{ marginLeft: "0.5em" }}>
              <Form.Item name={[...prefix, "delay_min"]} noStyle>
                <Input
                  size="small"
                  placeholder="min, e.g. 100ms"
                  style={{ width: 150 }}
                />
              </Form.Item>
              <span style={{ padding: "0 0.5em" }}>→</span>
              <Form.Item name={[...prefix, "delay_max"]} noStyle>
                <Input
                  size="small"
                  placeholder="max, e.g. 1s"
                  style={{ width: 150 }}
                />
              </Form.Item>
            </span>
          );
        }
        return null;
      }}
    </Form.Item>
  </div>
);
