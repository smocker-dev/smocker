import * as React from "react";
import useAxios from "axios-hooks";
import classNames from "classnames";
import { UnControlled as CodeMirror } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/material.css";
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/brace-fold";
import "./History.scss";
import { Multimap, formQueryParams, trimedPath, usePollAPI } from "~utils";

interface Entry {
  request: Request;
  response: Response;
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

const Entry = ({ value }: { value: Entry }) => (
  <div className="entry">
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
    <div className="response">
      <span
        className={classNames(
          "status",
          { info: value.response.status !== 666 },
          { failure: value.response.status === 666 }
        )}
      >
        {value.response.status}
      </span>
      {value.response.headers && (
        <table>
          <tbody>
            {Object.entries(value.response.headers).map(([key, values]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{values.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <CodeMirror
        value={
          value.response.body
            ? JSON.stringify(value.response.body, undefined, "  ")
            : ""
        }
        options={{
          mode: "application/json",
          theme: "material",
          lineNumbers: true,
          readOnly: true,
          viewportMargin: Infinity,
          foldGutter: true,
          gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
        }}
      />
    </div>
  </div>
);

const EntryList = () => {
  const [{ data, loading, error }] = usePollAPI<Entry[]>(
    trimedPath + "/history",
    {},
    10000
  );
  const isEmpty = !Boolean(data) || !Boolean(data.length);
  if (isEmpty && loading) {
    return (
      <div className="dimmer">
        <div className="loader" />
      </div>
    );
  }
  if (error) return <div>{error}</div>;
  if (isEmpty)
    return (
      <div className="empty">
        <h3>No entry found</h3>
      </div>
    );
  return (
    <div className="list">
      {data.map((entry, index) => (
        <Entry key={`entry-${index}`} value={entry} />
      ))}
    </div>
  );
};

export const History = () => {
  return (
    <div className="history">
      <EntryList />
    </div>
  );
};
