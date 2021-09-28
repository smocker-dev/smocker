import * as React from "react";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Col, Form,
  Input, Row,
  Select,
  Space
} from "antd";
import Code from "../Code";
import { defaultMatcher } from "~modules/types";
import { positiveMatchers, negativeMatchers, unaryMatchers } from "./utils";
import { bodyMatcherToPaths } from "~modules/utils";

interface BodyMatcherEditorProps {
  name: string[];
}

export const BodyMatcherEditor = ({ name }: BodyMatcherEditorProps): JSX.Element => {
  const [initialized, setInitialized] = React.useState(false);
  const [rawJSON, setRawJSON] = React.useState("");

  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => !initialized ? (
        <>
          <p>
            Please paste a JSON payload below in order to generate the
            corresponding body matcher. For better results, only keep the JSON
            fields you want to match upon.
          </p>
          <Code
            language="json"
            value={rawJSON}
            onChange={(value) => setRawJSON(value)} />
          <Row>
            <Col span={24} style={{ textAlign: "right", marginTop: "0.5em" }}>
              <Button
                onClick={() => {
                  const json = JSON.parse(rawJSON);
                  Object.entries(bodyMatcherToPaths(json)).map(([key, value]) => {
                    add({ key, matcher: "ShouldEqual", value });
                  });
                  setInitialized(true);
                }}
              >
                Generate Body Matcher
              </Button>
            </Col>
          </Row>
        </>
      ) : (
        <>
          {/* TODO: factorize this with KeyValueEditor */}
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
};
