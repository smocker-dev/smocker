import * as React from "react";
import { Form, Select } from "antd";
import Code from "../Code";

export const MockDynamicResponseEditor = (): JSX.Element => (
  <>
    <Form.Item label="Engine" name={["dynamic_response", "engine"]}>
      <Select>
        <Select.Option value="go_template_yaml">
          Go Template (YAML)
        </Select.Option>
        <Select.Option value="go_template_json">
          Go Template (JSON)
        </Select.Option>
        <Select.Option value="lua">Lua</Select.Option>
      </Select>
    </Form.Item>

    <Form.Item
      noStyle
      shouldUpdate={(prevValues, currentValues) => prevValues?.dynamic_response?.engine !==
        currentValues?.dynamic_response?.engine}
    >
      {({ getFieldValue }) => (
        <Form.Item label="Script" name={["dynamic_response", "script"]}>
          <Code language={getFieldValue(["dynamic_response", "engine"])} />
        </Form.Item>
      )}
    </Form.Item>
  </>
);
