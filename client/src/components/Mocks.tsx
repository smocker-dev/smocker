import * as React from "react";
import useAxios from "axios-hooks";
import classNames from "classnames";
import { UnControlled as CodeMirror } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/material.css";
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/yaml/yaml";
import "codemirror/mode/ruby/ruby";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/indent-fold";
import "codemirror/addon/fold/comment-fold";
import "./Mocks.scss";
import { formQueryParams, Multimap, trimedPath } from "~utils";

interface Mock {
  request: Request;
  response?: Response;
  dynamic_response?: DynamicResponse;
  context: Context;
  state: State;
}

interface Request {
  path: string;
  method: string;
  body?: string;
  query_params?: Multimap;
  headers?: Multimap;
}

interface Response {
  status: number;
  body?: any;
  headers?: Multimap;
}

interface DynamicResponse {
  engine: string;
  script: string;
}

interface Context {
  times?: number;
}

interface State {
  times_count: number;
}

const responseCodeMirrorOptions = {
  mode: "application/json",
  theme: "material",
  lineNumbers: true,
  readOnly: true,
  viewportMargin: Infinity,
  foldGutter: true,
  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
};

const MockResponse = ({ response }: { response: Response }) => (
  <div className="response">
    <span
      className={classNames(
        "status",
        { info: response.status !== 666 },
        { failure: response.status === 666 }
      )}
    >
      {response.status}
    </span>
    {response.headers && (
      <table>
        <tbody>
          {Object.entries(response.headers).map(([key, values]) => (
            <tr key={key}>
              <td>{key}</td>
              <td>{values.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
    <CodeMirror
      value={response.body ? response.body.trim() : ""}
      options={responseCodeMirrorOptions}
    />
  </div>
);

const dynamicCodeMirrorOptions = {
  theme: "material",
  lineNumbers: true,
  readOnly: true,
  viewportMargin: Infinity,
  foldGutter: true,
  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
};

const MockDynamicResponse = ({ response }: { response: DynamicResponse }) => {
  let mode;
  switch (response.engine) {
    case "lua":
      mode = "ruby"; // because lua mode doesn't handle fold
      break;
    case "go_template_json":
      mode = "application/json";
    default:
      mode = "yaml";
  }
  const options = {
    ...dynamicCodeMirrorOptions,
    mode
  };
  return (
    <div className="response">
      <span className="engine info">Engine: </span>
      <span>{response.engine}</span>
      <CodeMirror value={response.script} options={options} />
    </div>
  );
};

const Mock = ({ value }: { value: Mock }) => (
  <div className="mock">
    <div className="request">
      <span className="method">{value.request.method}</span>
      <span className="path">
        {value.request.path + formQueryParams(value.request.query_params)}
      </span>
      {value.request.headers && (
        <table>
          <tbody>
            {Object.entries(value.request.headers).map(([key, values]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{values.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
    {value.response && <MockResponse response={value.response} />}
    {value.dynamic_response && (
      <MockDynamicResponse response={value.dynamic_response} />
    )}
  </div>
);

const MockList = () => {
  const [{ data, loading, error }] = useAxios<Mock[]>(trimedPath + "/mocks");
  if (loading) {
    return (
      <div className="dimmer">
        <div className="loader" />
      </div>
    );
  }
  if (error) return <div>{error}</div>;
  if (!Boolean(data.length))
    return (
      <div className="empty">
        <h3>No mocks found</h3>
      </div>
    );
  return (
    <div className="list">
      {data.map((mock, index) => (
        <Mock key={`mock-${index}`} value={mock} />
      ))}
    </div>
  );
};

export const Mocks = () => {
  return (
    <div className="mocks">
      <MockList />
    </div>
  );
};
