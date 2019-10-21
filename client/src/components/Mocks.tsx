import * as React from "react";
import classNames from "classnames";
import { UnControlled as CodeMirror, Controlled } from "react-codemirror2";
import jsyaml from "js-yaml";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/material.css";
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/addon/lint/lint.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/yaml/yaml";
import "codemirror/mode/ruby/ruby";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/indent-fold";
import "codemirror/addon/fold/comment-fold";
import "codemirror/addon/lint/lint";
import "codemirror/addon/lint/yaml-lint";
import "./Mocks.scss";
import {
  formQueryParams,
  trimedPath,
  usePollAPI,
  toMultimap,
  toString,
  extractMatcher
} from "~utils";
import useAxios from "axios-hooks";
import Context, {
  Mock,
  MockResponse,
  MockDynamicResponse,
  MockRequest
} from "./Context";

window.jsyaml = jsyaml;

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

const emptyResponse: any = {};

const MockResponse = ({ mock }: { mock: Mock }) => {
  const { response: resp, context, state } = mock;
  const response = resp ? resp : (emptyResponse as MockResponse);

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
          {response.status || 200}
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
    : (emptyResponse as MockDynamicResponse);

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

const MockRequest = ({ request }: { request: MockRequest }) => {
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

const NewMock = ({
  onSave,
  onClose
}: {
  onSave: () => void;
  onClose: () => void;
}) => {
  const [mock, changeMock] = React.useState("");
  const [{ data, loading, error }, postNewMock] = useAxios(
    {
      url: trimedPath + "/mocks",
      method: "POST",
      headers: { "Content-Type": "application/x-yaml" }
    },
    { manual: true }
  );
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    postNewMock({ data: mock });
  };
  const handleCancel = (event: React.MouseEvent) => {
    event.preventDefault();
    onClose();
  };
  const handleChangeMock = (_: any, __: any, value: string) => {
    changeMock(value);
  };
  if (data) {
    onSave();
    return null;
  }
  return (
    <form onSubmit={handleSubmit}>
      <Controlled
        value={mock}
        options={{
          mode: "yaml",
          theme: "material",
          lineNumbers: true,
          viewportMargin: Infinity,
          foldGutter: true,
          lint: true,
          gutters: [
            "CodeMirror-lint-markers",
            "CodeMirror-linenumbers",
            "CodeMirror-foldgutter"
          ]
        }}
        onBeforeChange={handleChangeMock}
      />
      {error && error.response && <p>{error.response.data.message}</p>}
      <button
        className={classNames("white", { loading })}
        onClick={handleCancel}
      >
        Cancel
      </button>
      <button className={classNames("green", { loading })}>Save</button>
    </form>
  );
};

export const Mocks = () => {
  const [
    { data, loading, error },
    { polling, togglePolling, refetch }
  ] = usePollAPI<Mock[]>(trimedPath + "/mocks", 10000);
  const [displayNewMock, setDisplayNewMock] = React.useState(false);
  const { mocks, setMocks } = React.useContext(Context);
  const isEmpty = mocks.length === 0 && (!data || data.length === 0);
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
  } else if (data && data.length) {
    setMocks([...data]);
    data.length = 0;
  } else {
    body = mocks.map((mock, index) => (
      <Mock key={`entry-${index}`} mock={mock} />
    ));
  }

  const handleAddNewMock = () => setDisplayNewMock(true);
  const handleCancelNewMock = () => setDisplayNewMock(false);
  const handleSaveNewMock = () => {
    setDisplayNewMock(false);
    refetch();
  };
  return (
    <div className="mocks">
      <div className="list">
        {displayNewMock && (
          <NewMock onSave={handleSaveNewMock} onClose={handleCancelNewMock} />
        )}
        <div className="header">
          {!displayNewMock ? (
            <button className="green button" onClick={handleAddNewMock}>
              Add Mock
            </button>
          ) : (
            <div />
          )}
          <button
            className={classNames({ loading }, { red: polling })}
            onClick={loading ? undefined : togglePolling}
          >
            {polling ? "Stop Refresh" : "Start Refresh"}
          </button>
        </div>
        {body}
      </div>
    </div>
  );
};
