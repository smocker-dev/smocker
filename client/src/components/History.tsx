import classNames from "classnames";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/theme/material.css";
import { orderBy } from "lodash-es";
import { DateTime, Settings } from "luxon";
import * as React from "react";
import { UnControlled as CodeMirror } from "react-codemirror2";
import ReactPaginate from "react-paginate";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import useLocalStorage from "react-use-localstorage";
import { Dispatch } from "redux";
import { Actions, actions } from "~modules/actions";
import { AppState } from "~modules/reducers";
import { dateFormat, Entry, Error, History } from "~modules/types";
import { formQueryParams, usePoll } from "~utils";
import "./History.scss";

Settings.defaultLocale = "en-US";

const Entry = React.memo(({ value }: { value: Entry }) => (
  <div className="entry">
    <div className="request">
      <div className="details">
        <span className="method">{value.request.method}</span>
        <span className="path">
          {value.request.path + formQueryParams(value.request.query_params)}
        </span>
        <span className="date">
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
            value.request.body
              ? JSON.stringify(value.request.body, undefined, "  ") ||
                value.request.body
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
      {value.mock_id && (
        <div className="mock">
          <span className="label">Mock</span>
          <Link to={`/pages/mocks/${value.mock_id}`}>{value.mock_id}</Link>
        </div>
      )}
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
        <span className="date">
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
              ? JSON.stringify(value.response.body, undefined, "  ") ||
                value.response.body
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
));

interface Props {
  loading: boolean;
  history: History;
  error: Error | null;
  fetch: () => any;
}

const History = ({ history, loading, error, fetch }: Props) => {
  const [order, setOrder] = useLocalStorage("history.order.by.date", "desc");
  const [entryField, setEntryField] = useLocalStorage(
    "history.order.by.entry.field",
    "response"
  );
  const numberPerPage = 10;
  const [page, setPage] = React.useState(0);
  const [polling, togglePolling] = usePoll(fetch, 10000);
  const ref = React.createRef<any>();
  React.useLayoutEffect(() => {
    if (ref.current) {
      ref.current.scrollTo(0, 0);
    }
    return;
  }, [page]);
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
    const pageCount = Math.ceil(history.length / numberPerPage);
    const entries = orderBy(history, `${entryField}.date`, order as any).slice(
      Math.max(page * numberPerPage, 0),
      Math.min((page + 1) * numberPerPage, history.length)
    );
    const onChangePage = ({ selected }: any) => setPage(selected);
    const pagination = (
      <ReactPaginate
        previousLabel="<"
        nextLabel=">"
        breakLabel="..."
        breakClassName="break"
        pageCount={Math.ceil(history.length / numberPerPage)}
        forcePage={page}
        marginPagesDisplayed={2}
        pageRangeDisplayed={2}
        onPageChange={onChangePage}
        activeLinkClassName="active"
      />
    );
    body = (
      <>
        {pageCount > 1 && <div className="pagination start">{pagination}</div>}
        {entries.map((entry, index) => (
          <Entry key={`entry-${index}`} value={entry} />
        ))}
        {pageCount > 1 && <div className="pagination">{pagination}</div>}
      </>
    );
  }
  const onSort = () =>
    setEntryField(entryField === "request" ? "response" : "request");
  const onSortDate = () => setOrder(order === "asc" ? "desc" : "asc");
  return (
    <div className="history" ref={ref}>
      <div className="list">
        <div className="header">
          <span>
            > Order by
            <a id="entryField-order" className="order" onClick={onSort}>
              <strong>{`"${entryField}"`}</strong>
            </a>
            date:
            <a id="date-order" className="order" onClick={onSortDate}>
              <strong>
                {`"${order === "asc" ? "oldest first" : "newest first"}"`}
              </strong>
            </a>
          </span>
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
