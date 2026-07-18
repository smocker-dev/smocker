import * as React from "react";
import { Col, Form, Input, Radio, Row, Select, Space } from "antd";
import Code from "../Code";
import { defaultMatcher } from "../../modules/types";
import { BodyMatcherEditor } from "./BodyMatcherEditor";
import { KeyValueEditor } from "./KeyValueEditor";
import { matcherOptions } from "./utils";
import classNames from "classnames";

const httpMethods = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "TRACE",
  "CONNECT",
].map((m) => ({ value: m, label: m }));

export const MockRequestEditor = (): React.JSX.Element => {
  // TODO: handle YAML and XML
  const languages = [
    { label: "JSON", value: "json" },
    { label: "Default", value: "txt" },
  ];

  return (
    <>
      <Form.Item label="Method">
        <Space.Compact style={{ width: "100%" }}>
          <Form.Item name={["request", "method_matcher"]} noStyle>
            <Select style={{ width: 210 }} options={matcherOptions} />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) =>
              prev?.request?.method_matcher !== cur?.request?.method_matcher
            }
          >
            {({ getFieldValue }) =>
              getFieldValue(["request", "method_matcher"]) ===
              defaultMatcher ? (
                <Form.Item name={["request", "method"]} noStyle>
                  <Select style={{ width: 160 }} options={httpMethods} />
                </Form.Item>
              ) : (
                <Form.Item name={["request", "method"]} noStyle>
                  <Input placeholder="e.g. GET|POST" />
                </Form.Item>
              )
            }
          </Form.Item>
        </Space.Compact>
      </Form.Item>

      <Form.Item label="Endpoint">
        <Space.Compact style={{ width: "100%" }}>
          <Form.Item name={["request", "path_matcher"]} noStyle>
            <Select style={{ width: 210 }} options={matcherOptions} />
          </Form.Item>
          <Form.Item name={["request", "path"]} noStyle>
            <Input placeholder="/example" />
          </Form.Item>
        </Space.Compact>
      </Form.Item>

      <Row gutter={24}>
        <Col span={12}>
          Query parameters:
          <KeyValueEditor name={["request", "query_parameters"]} withMatchers />
        </Col>

        <Col span={12}>
          Headers:
          <KeyValueEditor name={["request", "headers"]} withMatchers />
        </Col>
      </Row>

      <div style={{ width: "80%", margin: "auto" }}>
        Body:
        <Form.Item name={["request", "body_type"]}>
          <Radio.Group
            options={languages}
            optionType="button"
            size="small"
            style={{ display: "block", textAlign: "center", marginBottom: 5 }}
          />
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues?.request?.body_type !== currentValues?.request?.body_type
          }
        >
          {({ getFieldValue }) => (
            <>
              {/* Use divs with display to make sure the form components render */}
              <div
                className={classNames({
                  "display-none":
                    getFieldValue(["request", "body_type"]) !== "json",
                })}
              >
                <BodyMatcherEditor name={["request", "body_json"]} />
              </div>
              <div
                className={classNames({
                  "display-none":
                    getFieldValue(["request", "body_type"]) !== "txt",
                })}
              >
                <Form.Item name={["request", "body_txt_matcher"]} noStyle>
                  <Select
                    options={matcherOptions}
                    size="small"
                    style={{ width: 210, marginBottom: 5 }}
                  />
                </Form.Item>
                <Form.Item name={["request", "body_txt_value"]} noStyle>
                  <Code language="txt" />
                </Form.Item>
              </div>
            </>
          )}
        </Form.Item>
      </div>
    </>
  );
};
