import * as React from "react";
import { Form, Select } from "antd";
import Code from "../Code";

export const MockDynamicResponseEditor = (): React.JSX.Element => (
  <>
    <Form.Item label="Engine" name={["dynamic_response", "engine"]}>
      <Select
        options={[
          { value: "go_template_yaml", label: "Go Template (YAML)" },
          { value: "go_template_json", label: "Go Template (JSON)" },
          { value: "lua", label: "Lua" },
        ]}
      />
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
