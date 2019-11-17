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
import { formQueryParams, usePoll } from "~utils";
import { orderBy } from "lodash-es";
import useLocalStorage from "react-use-localstorage";
import { DateTime, Settings } from "luxon";
import { Entry, History, Error } from "~modules/types";
import { connect } from "react-redux";
import { AppState } from "~modules/reducers";
import { Dispatch } from "redux";
import { Actions, actions } from "~modules/actions";

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
            lineWrapping: true,
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
            lineWrapping: true,
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

interface Props {
  loading: boolean;
  history: History;
  error: Error | null;
  fetch: () => any;
}

const History = ({ history, loading, error, fetch }: Props) => {
  const [asc, setAsc] = useLocalStorage("history.order.request.by.date", "asc");
  const [polling, togglePolling] = usePoll(fetch, 10000);
  const isEmpty = history.length === 0;
  let body = null;
  if (error) {
    body = <pre className="error">{error.message}</pre>;
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
            <strong>
              {`> Order by request date: "${
                asc === "asc" ? "oldest first" : "newest first"
              }"`}
            </strong>
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

export default connect(
  (state: AppState) => ({
    loading: state.history.loading,
    history: state.history.list,
    error: state.history.error
  }),
  (dispatch: Dispatch<Actions>) => ({
    fetch: () => dispatch(actions.fetchHistory.request())
  })
)(History);
