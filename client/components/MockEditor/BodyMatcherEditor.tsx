import * as React from "react";
import { Button, Col, Form, Row } from "antd";
import Code from "../Code";
import { bodyMatcherToPaths } from "../../modules/utils";
import { KeyValueEditorEngine } from "./KeyValueEditor";

interface BodyMatcherEditorProps {
  name: string[];
}

export const BodyMatcherEditor = ({
  name,
}: BodyMatcherEditorProps): JSX.Element => {
  const [initialized, setInitialized] = React.useState(false);
  const [rawJSON, setRawJSON] = React.useState("");

  return (
    <Form.List name={name}>
      {(fields, actions) =>
        !initialized ? (
          <>
            <p>
              Please paste a JSON payload below in order to generate the
              corresponding body matcher. For better results, only keep the JSON
              fields you want to match upon.
            </p>
            <Code
              language="json"
              value={rawJSON}
              onChange={(value) => setRawJSON(value)}
            />
            <Row>
              <Col span={24} style={{ textAlign: "right", marginTop: "0.5em" }}>
                <Button
                  onClick={() => {
                    try {
                      const json = JSON.parse(rawJSON);
                      Object.entries(bodyMatcherToPaths(json)).forEach(
                        ([key, value]) => {
                          // TODO: handle more matchers
                          actions.add({ key, matcher: "ShouldEqual", value });
                        }
                      );
                      setInitialized(true);
                    } catch (e) {
                      console.error("Invalid JSON body", e);
                    }
                  }}
                >
                  Generate Body Matcher
                </Button>
              </Col>
            </Row>
          </>
        ) : (
          <KeyValueEditorEngine
            name={name}
            withMatchers={true}
            fields={fields}
            actions={actions}
          />
        )
      }
    </Form.List>
  );
};
