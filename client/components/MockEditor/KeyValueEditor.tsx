import * as React from "react";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, Select, Space } from "antd";
import { defaultMatcher } from "~modules/types";
import { positiveMatchers, negativeMatchers, unaryMatchers } from "./utils";
import { FormListFieldData, FormListOperation } from "antd/lib/form/FormList";

export interface KeyValueEditorProps {
  name: string[];
  withMatchers?: boolean;
}

export const KeyValueEditor = ({
  name,
  withMatchers,
}: KeyValueEditorProps): JSX.Element => (
  <Form.List name={name}>
    {(fields, actions) => (
      <KeyValueEditorEngine
        name={name}
        withMatchers={withMatchers}
        fields={fields}
        actions={actions}
      />
    )}
  </Form.List>
);

export interface KeyValueEditorEngineProps extends KeyValueEditorProps {
  fields: FormListFieldData[];
  actions: FormListOperation;
}

export const KeyValueEditorEngine = ({
  name,
  withMatchers,
  fields,
  actions,
}: KeyValueEditorEngineProps): JSX.Element => (
  <div style={{ margin: "auto" }}>
    {fields.map(({ key, name: fieldName, fieldKey, ...restField }) => (
      <Space
        key={key}
        style={{ display: "flex", justifyContent: "center" }}
        align="baseline"
      >
        <MinusCircleOutlined onClick={() => actions.remove(fieldName)} />

        <Form.Item
          {...restField}
          name={[fieldName, "key"]}
          fieldKey={[fieldKey, "key"]}
        >
          <Input placeholder="Key" />
        </Form.Item>

        {withMatchers && (
          <Form.Item
            {...restField}
            name={[fieldName, "matcher"]}
            fieldKey={[fieldKey, "matcher"]}
          >
            <Select>
              <Select.OptGroup label="Positive">
                {positiveMatchers.map((matcher) => (
                  <Select.Option key={matcher} value={matcher}>
                    {matcher}
                  </Select.Option>
                ))}
              </Select.OptGroup>
              <Select.OptGroup label="Negative">
                {negativeMatchers.map((matcher) => (
                  <Select.Option key={matcher} value={matcher}>
                    {matcher}
                  </Select.Option>
                ))}
              </Select.OptGroup>
            </Select>
          </Form.Item>
        )}

        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) => (
            <Form.Item
              {...restField}
              name={[fieldName, "value"]}
              fieldKey={[fieldKey, "value"]}
              hidden={unaryMatchers.includes(
                getFieldValue([...name, fieldKey, "matcher"])
              )}
            >
              <Input placeholder="Value" />
            </Form.Item>
          )}
        </Form.Item>
      </Space>
    ))}

    <Form.Item>
      <Button
        type="dashed"
        onClick={() => actions.add({ matcher: defaultMatcher })}
        style={{ width: "100%" }}
        icon={<PlusOutlined />}
      >
        Add field
      </Button>
    </Form.Item>
  </div>
);
