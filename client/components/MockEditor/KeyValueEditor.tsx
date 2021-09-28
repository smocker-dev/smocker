import * as React from "react";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button, Form,
  Input, Select,
  Space
} from "antd";
import { defaultMatcher } from "~modules/types";
import { positiveMatchers, negativeMatchers, unaryMatchers } from "./utils";

export interface KeyValueEditorProps {
  name: string[];
  withMatchers?: boolean;
}

export const KeyValueEditor = ({
  name, withMatchers,
}: KeyValueEditorProps): JSX.Element => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <>
        {fields.map(({ key, name: fieldName, fieldKey, ...restField }) => (
          <Space key={key} style={{ display: "flex" }} align="baseline">
            <MinusCircleOutlined onClick={() => remove(fieldName)} />

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

            <Form.Item
              noStyle
              shouldUpdate
            >
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
            onClick={() => add({ matcher: defaultMatcher })}
            style={{ width: "100%" }}
            icon={<PlusOutlined />}
          >
            Add field
          </Button>
        </Form.Item>
      </>
    )}
  </Form.List>
);
