import { orderBy } from "lodash-es";
import { DateTime, Settings } from "luxon";
import * as React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import useLocalStorage from "react-use-localstorage";
import { Dispatch } from "redux";
import { Actions, actions } from "~modules/actions";
import { AppState } from "~modules/reducers";
import { dateFormat, Entry, Error, History } from "~modules/types";
import { formQueryParams, usePoll } from "~utils";
import {
  Empty,
  Button,
  Icon,
  PageHeader,
  Pagination,
  Alert,
  Tag,
  Row,
  Spin,
  Typography
} from "antd";
import "./History.scss";
import Code from "./Code";

Settings.defaultLocale = "en-US";

const Entry = React.memo(({ value }: { value: Entry }) => (
  <div className="entry">
    <div className="request">
      <div className="details">
        <Tag color="blue">{value.request.method}</Tag>
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
        <Code
          value={
            JSON.stringify(value.request.body, null, "  ") || value.request.body
          }
          language="json"
        />
      )}
    </div>
    <div className="response">
      <div className="details">
        <Tag color={value.response.status > 600 ? "red" : "blue"}>
          {value.response.status}
        </Tag>
        {value.response.status > 600 && (
          <Typography.Text type="danger" className="ellipsis">
            {value.response.body.message}
          </Typography.Text>
        )}
        <span className="ellipsis">
          {value.mock_id && (
            <Link to={`/pages/mocks/${value.mock_id}`}>Matched Mock</Link>
          )}
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
        <Code
          value={
            JSON.stringify(value.response.body, null, "  ") ||
            value.response.body
          }
          language="json"
        />
      )}
    </div>
  </div>
));

interface Props {
  sessionID: string;
  loading: boolean;
  history: History;
  error: Error | null;
  fetch: (sessionID: string) => any;
}

const History = ({ sessionID, history, loading, error, fetch }: Props) => {
  const minPageSize = 10;
  const [order, setOrder] = useLocalStorage("history.order.by.date", "desc");
  const [entryField, setEntryField] = useLocalStorage(
    "history.order.by.entry.field",
    "response"
  );
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(minPageSize);
  const [polling, togglePolling] = usePoll(10000, fetch, sessionID);
  const ref = React.createRef<any>();
  React.useLayoutEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, [page, pageSize]);
  const isEmpty = history.length === 0;
  let body = null;
  if (error) {
    body = <Alert message={error.message} type="error" />;
  } else if (isEmpty) {
    body = <Empty description="The history is empty." />;
  } else {
    const entries = orderBy(history, `${entryField}.date`, order as any).slice(
      Math.max((page - 1) * pageSize, 0),
      Math.min(page * pageSize, history.length)
    );
    const onChangePage = (p: number) => setPage(p);
    const onChangePagSize = (p: number, ps: number) => {
      setPage(p);
      setPageSize(ps);
    };
    const pagination = (
      <Row
        type="flex"
        justify="space-between"
        align="middle"
        className="container"
      >
        <div>
          <Pagination
            hideOnSinglePage={history.length <= minPageSize}
            showSizeChanger
            pageSize={pageSize}
            current={page}
            onChange={onChangePage}
            onShowSizeChange={onChangePagSize}
            total={history.length}
          />
        </div>
        <Spin
          spinning={loading}
          className={history.length <= minPageSize ? "absolute" : ""}
        />
      </Row>
    );
    body = (
      <>
        {pagination}
        {entries.map((entry, index) => (
          <Entry key={`entry-${index}`} value={entry} />
        ))}
        {pagination}
      </>
    );
  }
  const onSort = () =>
    setEntryField(entryField === "request" ? "response" : "request");
  const onSortDate = () => setOrder(order === "asc" ? "desc" : "asc");
  return (
    <div className="history" ref={ref}>
      <PageHeader
        title="History"
        extra={
          <Button
            loading={loading && { delay: 300 }}
            onClick={togglePolling}
            type={polling ? "danger" : "default"}
          >
            <Icon
              type={polling ? "pause-circle" : "play-circle"}
              theme={"filled"}
            />
            Autorefresh
          </Button>
        }
      >
        <p>This is the history of the requests made since the last reset.</p>
        <p>
          Entries are sorted by
          <Button onClick={onSort} type="link">
            {entryField}
          </Button>
          and the
          <Button onClick={onSortDate} type="link">
            {order === "asc" ? "oldest" : "newest"}
          </Button>
          are displayed first.
        </p>
        <Spin delay={300} spinning={loading && history.length === 0}>
          {body}
        </Spin>
      </PageHeader>
    </div>
  );
};

export default connect(
  (state: AppState) => ({
    sessionID: state.sessions.selected,
    loading: state.history.loading,
    history: state.history.list,
    error: state.history.error
  }),
  (dispatch: Dispatch<Actions>) => ({
    fetch: (sessionID: string) =>
      dispatch(actions.fetchHistory.request(sessionID))
  })
)(History);
