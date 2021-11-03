import * as React from "react";
import { Form, InputNumber, Switch } from "antd";

export const MockContextEditor = (): JSX.Element => (
  <div className="inline-form-items">
    <Form.Item name={["context", "times_enabled"]} noStyle>
      <Switch size="small" />
    </Form.Item>

    <Form.Item
      label="Limit this mock to be called"
      shouldUpdate={(prevValues, currentValues) => prevValues?.context?.times_enabled !==
        currentValues?.context?.times_enabled ||
        prevValues?.context?.times !== currentValues?.context?.times}
      style={{ marginBottom: 0, paddingLeft: "5px" }}
    >
      {({ getFieldValue }) => (
        <>
          <Form.Item name={["context", "times"]} noStyle>
            <InputNumber
              min={1}
              disabled={!getFieldValue(["context", "times_enabled"])} />
          </Form.Item>
          {getFieldValue(["context", "times"]) <= 1 ? (
            <span> time</span>
          ) : (
            <span> times</span>
          )}
        </>
      )}
    </Form.Item>
  </div>
);
