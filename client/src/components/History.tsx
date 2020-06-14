import {
  PartitionOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  PlusCircleOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Empty,
  PageHeader,
  Pagination,
  Row,
  Spin,
  Tag,
  Typography,
} from "antd";
import yaml from "js-yaml";
import orderBy from "lodash/orderBy";
import dayjs from "dayjs";
import * as React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import useLocalStorage from "react-use-localstorage";
import { Dispatch } from "redux";
import { Actions, actions } from "~modules/actions";
import { AppState } from "~modules/reducers";
import { dateFormat, Entry, Error, History } from "~modules/types";
import {
  cleanupRequest,
  entryToCurl,
  formatQueryParams,
  usePoll,
} from "~modules/utils";
import Code from "./Code";
import "./History.scss";

const Entry = React.memo(
  ({
    value,
    handleDisplayNewMock,
  }: {
    value: Entry;
    handleDisplayNewMock: () => unknown;
  }) => {
    const path =
      value.request.path + formatQueryParams(value.request.query_params);
    return (
      <div className="entry">
        <div className="request">
          <div className="details">
            <Tag color="blue">{value.request.method}</Tag>
            <Typography.Text ellipsis className="path" title={path}>
              {path}
            </Typography.Text>
            <span className="date">
              {dayjs(value.request.date).format(dateFormat)}
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
                JSON.stringify(value.request.body, null, "  ") ||
                value.request.body
              }
              language="json"
            />
          )}
          <div className="actions">
            <Typography.Paragraph copyable={{ text: entryToCurl(value) }}>
              Copy as curl
            </Typography.Paragraph>
          </div>
        </div>
        <div className="response">
          <div className="details">
            <Tag color={value.response.status > 600 ? "red" : "blue"}>
              {value.response.status}
            </Tag>
            {value.response.status > 600 && (
              <Typography.Text type="danger" ellipsis>
                {value.response.body.message}
              </Typography.Text>
            )}
            <Typography.Text ellipsis>
              {value.mock_id && (
                <Link to={`/pages/mocks/${value.mock_id}`}>Matched Mock</Link>
              )}
            </Typography.Text>
            <span className="date">
              {dayjs(value.response.date).format(dateFormat)}
            </span>
          </div>
          {value.response.status > 600 && (
            <Typography.Paragraph>
              <Link to="/pages/mocks" onClick={handleDisplayNewMock}>
                <Button block type="dashed">
                  <PlusCircleOutlined />
                  Create mock from request
                </Button>
              </Link>
            </Typography.Paragraph>
          )}
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
    );
  }
);
Entry.displayName = "Entry";

interface Props {
  sessionID: string;
  loading: boolean;
  canPoll: boolean;
  historyEntry: History;
  error: Error | null;
  fetch: (sessionID: string) => unknown;
  setDisplayNewMock: (display: boolean, defaultValue: string) => unknown;
}

const History = ({
  sessionID,
  historyEntry,
  loading,
  canPoll,
  error,
  fetch,
  setDisplayNewMock,
}: Props) => {
  React.useEffect(() => {
    document.title = "History | Smocker";
  });

  const minPageSize = 10;
  const [order, setOrder] = useLocalStorage("history.order.by.date", "desc");
  const [entryField, setEntryField] = useLocalStorage(
    "history.order.by.entry.field",
    "response"
  );
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(minPageSize);
  const [polling, togglePolling] = usePoll(10000, fetch, sessionID);
  const ref = React.createRef<HTMLDivElement>();
  React.useLayoutEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [page, pageSize]);
  const isEmpty = historyEntry.length === 0;
  let body = null;
  if (error) {
    body = <Alert message={error.message} type="error" />;
  } else if (isEmpty) {
    body = <Empty description="The history is empty." />;
  } else {
    const entries = orderBy(
      historyEntry,
      `${entryField}.date`,
      order as "asc" | "desc"
    ).slice(
      Math.max((page - 1) * pageSize, 0),
      Math.min(page * pageSize, historyEntry.length)
    );
    const handleDisplayNewMock = (entry: Entry) => () =>
      setDisplayNewMock(
        true,
        yaml.safeDump([
          {
            request: cleanupRequest(entry),
            response: {
              // Sane default response
              status: 200,
              headers: { "Content-Type": "application/json" },
              body: "",
            },
          },
        ])
      );
    const onChangePage = (p: number) => setPage(p);
    const onChangePageSize = (p: number, ps: number) => {
      setPage(p);
      setPageSize(ps);
    };
    const pagination = (
      <Row justify="space-between" align="middle" className="container">
        <div>
          <Pagination
            hideOnSinglePage={historyEntry.length <= minPageSize}
            showSizeChanger
            pageSize={pageSize}
            current={page}
            onChange={onChangePage}
            onShowSizeChange={onChangePageSize}
            total={historyEntry.length}
          />
        </div>
        <Spin
          spinning={loading}
          className={historyEntry.length <= minPageSize ? "absolute" : ""}
        />
      </Row>
    );
    body = (
      <>
        {pagination}
        {entries.map((entry, index) => (
          <Entry
            key={`entry-${index}`}
            value={entry}
            handleDisplayNewMock={handleDisplayNewMock(entry)}
          />
        ))}
        {historyEntry.length > minPageSize && pagination}
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
          <div className="action buttons">
            <Link
              to={(location) => ({ ...location, pathname: "/pages/visualize" })}
            >
              <Button
                type="primary"
                icon={<PartitionOutlined />}
                className="visualize-button"
              >
                Visualize
              </Button>
            </Link>
            {canPoll && (
              <Button
                loading={loading}
                onClick={togglePolling}
                danger={polling}
                icon={polling ? <PauseCircleFilled /> : <PlayCircleFilled />}
              >
                Autorefresh
              </Button>
            )}
          </div>
        }
      >
        <p>
          This is the history of the requests made during the selected session.
        </p>
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
        <Spin delay={300} spinning={loading && historyEntry.length === 0}>
          {body}
        </Spin>
      </PageHeader>
    </div>
  );
};

export default connect(
  (state: AppState) => {
    const { sessions, history } = state;
    const canPoll =
      !sessions.selected ||
      (sessions.list &&
        sessions.selected === sessions.list[sessions.list.length - 1].id);
    return {
      sessionID: sessions.selected,
      loading: history.loading,
      historyEntry: history.list,
      error: history.error,
      canPoll,
    };
  },
  (dispatch: Dispatch<Actions>) => ({
    fetch: (sessionID: string) =>
      dispatch(actions.fetchHistory.request(sessionID)),
    setDisplayNewMock: (display: boolean, defaultValue: string) =>
      dispatch(actions.openMockEditor([display, defaultValue])),
  })
)(History);
