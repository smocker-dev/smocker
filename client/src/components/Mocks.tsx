import * as React from "react";
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
import {
  formQueryParams,
  Multimap,
  trimedPath,
  usePollAPI,
  StringMatcher,
  MultimapMatcher,
  toMultimap,
  toString,
  extractMatcher
} from "~utils";

interface Mock {
  request: Request;
  response?: Response;
  dynamic_response?: DynamicResponse;
  context: Context;
  state: State;
}

interface Request {
  path: string | StringMatcher;
  method: string | StringMatcher;
  body?: string | StringMatcher;
  query_params?: Multimap | MultimapMatcher;
  headers?: Multimap | MultimapMatcher;
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

const codeMirrorOptions = {
  mode: "application/json",
  theme: "material",
  lineNumbers: true,
  readOnly: true,
  viewportMargin: Infinity,
  foldGutter: true,
  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
};

const renderTimes = (count: number, expected?: number) => {
  if (!expected) {
    return <strong>{"Times: " + count}</strong>;
  }
  if (count > expected) {
    return (
      <strong>
        {"Times: "}
        <strong className="wrong">{count}</strong>/{expected}
      </strong>
    );
  }
  return <strong>{`Times: ${count}/${expected}`}</strong>;
};

const MockResponse = ({ mock }: { mock: Mock }) => {
  const { response: resp, context, state } = mock;
  const response = resp ? resp : ({} as Response);

  return (
    <div className="response">
      <div className="details">
        <span
          className={classNames(
            "status",
            { info: response.status !== 666 },
            { failure: response.status === 666 }
          )}
        >
          {response.status}
        </span>
        {renderTimes(state.times_count, context.times)}
      </div>
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
        options={codeMirrorOptions}
      />
    </div>
  );
};

const MockDynamicResponse = ({ mock }: { mock: Mock }) => {
  const { dynamic_response, context, state } = mock;
  const response = dynamic_response
    ? dynamic_response
    : ({} as DynamicResponse);

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
    ...codeMirrorOptions,
    mode
  };
  return (
    <div className="response">
      <div className="details">
        <div>
          <span className="engine info">Engine</span>
          <span>
            <strong>{response.engine}</strong>
          </span>
        </div>
        {renderTimes(state.times_count, context.times)}
      </div>
      <CodeMirror value={response.script} options={options} />
    </div>
  );
};

const MockRequest = ({ request }: { request: Request }) => {
  const methodMatcher = extractMatcher(request.method);
  const method = toString(request.method);
  const pathMatcher = extractMatcher(request.path);
  const path = toString(request.path);
  const bodyMatcher = extractMatcher(request.body);
  const headersMatcher = extractMatcher(request.headers);
  return (
    <div className="request">
      <div className="details">
        <div>
          <span className="method">
            {methodMatcher && <strong>{methodMatcher + ": "}</strong>}
            {method}
          </span>
          <span className="path">
            {pathMatcher && <strong>{pathMatcher + ": "}</strong>}
            {path + formQueryParams(request.query_params)}
          </span>
        </div>
      </div>
      {request.headers && (
        <table>
          <tbody>
            {Object.entries(toMultimap(request.headers)).map(
              ([key, values]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>
                    {headersMatcher && <strong>{headersMatcher + ": "}</strong>}
                    {values.join(", ")}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
      {request.body && (
        <>
          <strong>{bodyMatcher && bodyMatcher + ": "}</strong>
          <CodeMirror
            value={toString(request.body)}
            options={codeMirrorOptions}
          />
        </>
      )}
    </div>
  );
};

const Mock = ({ mock }: { mock: Mock }) => {
  return (
    <div className="mock">
      <MockRequest request={mock.request} />
      {mock.response && <MockResponse mock={mock} />}
      {mock.dynamic_response && <MockDynamicResponse mock={mock} />}
    </div>
  );
};

const MockList = () => {
  const [{ data, loading, error }, poll, togglePoll] = usePollAPI<Mock[]>(
    trimedPath + "/mocks",
    10000
  );
  const isEmpty = !Boolean(data) || !Boolean(data.length);
  let body = null;
  if (error) {
    body = <p>{error}</p>;
  } else if (isEmpty && loading) {
    body = (
      <div className="dimmer">
        <div className="loader" />
      </div>
    );
  } else if (isEmpty) {
    body = (
      <div className="empty">
        <h3>No mock found</h3>
      </div>
    );
  } else {
    body = data.map((mock, index) => (
      <Mock key={`entry-${index}`} mock={mock} />
    ));
  }
  return (
    <div className="list">
      <div className="header">
        <a />
        <button
          className={loading ? "loading" : ""}
          onClick={loading ? undefined : togglePoll}
        >
          {poll ? "Stop Refresh" : "Start Refresh"}
        </button>
      </div>
      {body}
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
