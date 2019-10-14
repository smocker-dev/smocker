import * as React from "react";
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
import { orderBy } from "lodash-es";
import useLocalStorage from "react-use-localstorage";
import { DateTime, Settings } from "luxon";

interface Entry {
  request: Request;
  response: Response;
}

interface Request {
  path: string;
  method: string;
  body?: any;
  query_params?: Multimap;
  headers?: Multimap;
  date: string;
}

interface Response {
  status: number;
  body?: any;
  headers?: Multimap;
  date: string;
}

const dateFormat = "EEE, E MMM yyyy HH:mm:ss.SSS";
Settings.defaultLocale = "en-US";

const Entry = ({ value }: { value: Entry }) => (
  <div className="entry">
    <div className="request">
      <div className="details">
        <span className="method">{value.request.method}</span>
        <span className="path">
          {value.request.path + formQueryParams(value.request.query_params)}
        </span>
        <span className="fluid">
          {DateTime.fromISO(value.request.date).toFormat(dateFormat)}
        </span>
      </div>
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
      {value.request.body && (
        <CodeMirror
          value={
            value.response.body
              ? JSON.stringify(value.request.body, undefined, "  ")
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
      )}
    </div>
    <div className="response">
      <div className="details">
        <span
          className={classNames(
            "status",
            { info: value.response.status !== 666 },
            { failure: value.response.status === 666 }
          )}
        >
          {value.response.status}
        </span>
        <span className="fluid">
          {DateTime.fromISO(value.response.date).toFormat(dateFormat)}
        </span>
      </div>
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
      {value.response.body && (
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
      )}
    </div>
  </div>
);

const EntryList = () => {
  const [asc, setAsc] = useLocalStorage("history.order.request.by.date", "asc");
  const [{ data, loading, error }, poll, togglePoll] = usePollAPI<Entry[]>(
    trimedPath + "/history",
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
        <h3>No entry found</h3>
      </div>
    );
  } else {
    body = orderBy(data, "request.date", asc === "asc" ? "asc" : "desc").map(
      (entry, index) => <Entry key={`entry-${index}`} value={entry} />
    );
  }
  const onSort = () => setAsc(asc === "asc" ? "desc" : "asc");
  return (
    <div className="list">
      <div className="header">
        <a className="order" onClick={onSort}>
          <strong>{`> Order by request date "${asc}"`}</strong>
        </a>
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

export const History = () => {
  return (
    <div className="history">
      <EntryList />
    </div>
  );
};
