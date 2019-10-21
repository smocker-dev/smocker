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
import Context, { Entry } from "./Context";

const dateFormat = "EEE, dd MMM yyyy HH:mm:ss.SSS";
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

export const History = () => {
  const [asc, setAsc] = useLocalStorage("history.order.request.by.date", "asc");
  const [{ data, loading, error }, { polling, togglePolling }] = usePollAPI<
    Entry[]
  >(trimedPath + "/history", 10000);
  const { history, setHistory } = React.useContext(Context);
  const isEmpty = history.length === 0 && (!data || data.length === 0);
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
  } else if (data && data.length) {
    setHistory([...data]);
    data.length = 0;
  } else {
    body = orderBy(history, "request.date", asc === "asc" ? "asc" : "desc").map(
      (entry, index) => <Entry key={`entry-${index}`} value={entry} />
    );
  }
  const onSort = () => setAsc(asc === "asc" ? "desc" : "asc");
  return (
    <div className="history">
      <div className="list">
        <div className="header">
          <a className="order" onClick={onSort}>
            <strong>{`> Order by request date "${asc}"`}</strong>
          </a>
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
