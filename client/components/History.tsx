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
  Select,
  Spin,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { getReasonPhrase } from "http-status-codes";
import yaml from "js-yaml";
import orderBy from "lodash/orderBy";
import * as React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import useLocalStorage from "react-use-localstorage";
import { Dispatch } from "redux";
import { Actions, actions } from "../modules/actions";
import { AppState } from "../modules/reducers";
import { dateFormat, Entry, History, SmockerError } from "../modules/types";
import {
  cleanupRequest,
  cleanupResponse,
  entryToCurl,
  formatQueryParams,
  usePoll,
} from "../modules/utils";
import Code from "./Code";
import "./History.scss";

const TableRow = ([key, values]: [string, string[]]) => (
  <tr key={key}>
    <td>{key}</td>
    <td>{values.join(", ")}</td>
  </tr>
);

const EntryComponent = React.memo(
  ({
    value,
    handleDisplayNewMock,
  }: {
    value: Entry;
    handleDisplayNewMock: () => unknown;
  }) => {
    const path =
      value.request.path + formatQueryParams(value.request.query_params);

    let responseStatusColor = "blue";
    if (value.response.status >= 600) {
      responseStatusColor = "magenta";
    } else if (value.context.mock_type === "proxy") {
      if (value.response.status >= 500) {
        responseStatusColor = "red";
      } else if (value.response.status >= 400) {
        responseStatusColor = "orange";
      }
    }

    let responseStatusTitle = "Unknown HTTP status code";
    try {
      responseStatusTitle = getReasonPhrase(value.response.status);
    } catch {
      if (value.response.status >= 600) {
        responseStatusTitle = "Smocker error";
      }
    }

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
                {Object.entries(value.request.headers).map((entry) =>
                  TableRow(entry)
                )}
              </tbody>
            </table>
          )}
          {value.request.body && (
            <Code
              value={
                JSON.stringify(value.request.body, null, "  ") ||
                `${value.request.body}`
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
            {value.context.mock_type === "proxy" && <Tag>Proxified</Tag>}
            <Tag color={responseStatusColor} title={responseStatusTitle}>
              {value.response.status}
            </Tag>
            {value.response.status > 600 && (
              <Typography.Text
                className="error"
                ellipsis
                title={(value.response.body as SmockerError).message}
              >
                {(value.response.body as SmockerError).message}
              </Typography.Text>
            )}
            {value.context.mock_id && (
              <span>
                <Link to={`/pages/mocks/${value.context.mock_id}`}>
                  Matched Mock
                </Link>
              </span>
            )}
            <span className="date">
              {dayjs(value.response.date).format(dateFormat)}
            </span>
          </div>
          <Typography.Paragraph>
            <Link to="/pages/mocks" onClick={handleDisplayNewMock}>
              <Button block type="dashed">
                <PlusCircleOutlined />
                {value.response.status > 600
                  ? "Create a new mock from request"
                  : "Create a new mock from entry"}
              </Button>
            </Link>
          </Typography.Paragraph>
          {value.response.headers && (
            <table>
              <tbody>
                {Object.entries(value.response.headers).map((entry) =>
                  TableRow(entry)
                )}
              </tbody>
            </table>
          )}
          {value.response.body && (
            <Code
              value={
                JSON.stringify(value.response.body, null, "  ") ||
                `${value.response.body}`
              }
              language="json"
            />
          )}
          {value.context.delay && (
            <Typography.Paragraph className="delay">
              This response was delayed by <span>{value.context.delay}</span>
            </Typography.Paragraph>
          )}
        </div>
      </div>
    );
  }
);
EntryComponent.displayName = "Entry";

interface Props {
  sessionID: string;
  loading: boolean;
  canPoll: boolean;
  historyEntries: History;
  error: SmockerError | null;
  fetch: (sessionID: string) => unknown;
  setDisplayNewMock: (display: boolean, defaultValue: string) => unknown;
}

const HistoryComponent = ({
  sessionID,
  historyEntries,
  loading,
  canPoll,
  error,
  fetch,
  setDisplayNewMock,
}: Props) => {
  React.useEffect(() => {
    document.title = "History | Smocker";
  });

  // Filters and order
  const [order, setOrder] = useLocalStorage("history.order.by.date", "desc");
  const [entryField, setEntryField] = useLocalStorage(
    "history.order.by.entry.field",
    "response"
  );
  const [filter, setFilter] = useLocalStorage("history.filter", "all");

  // Pagination
  const minPageSize = 10;
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

  let body = null;
  if (error) {
    body = <Alert message={error.message} type="error" showIcon />;
  } else {
    const filteredEntries = orderBy(
      historyEntries,
      `${entryField}.date`,
      order as "asc" | "desc"
    ).filter((entry) => {
      if (filter === "http-errors") {
        return entry.response.status >= 400 && entry.response.status <= 599;
      }
      if (filter === "smocker-errors") {
        return entry.response.status >= 600 && entry.response.status <= 699;
      }
      return true;
    });

    if (filteredEntries.length === 0) {
      if (filter === "http-errors") {
        body = <Empty description="No HTTP errors in the history." />;
      } else if (filter === "smocker-errors") {
        body = <Empty description="No Smocker errors in the history." />;
      } else {
        body = <Empty description="The history is empty." />;
      }
    } else {
      const handleDisplayNewMock = (entry: Entry) => () => {
        const request = cleanupRequest(entry);
        const response =
          entry.response.status < 600
            ? cleanupResponse(entry)
            : {
                // Sane default response
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: "",
              };
        return setDisplayNewMock(true, yaml.safeDump([{ request, response }]));
      };
      const onChangePage = (p: number) => setPage(p);
      const onChangePageSize = (p: number, ps: number) => {
        setPage(p);
        setPageSize(ps);
      };
      const pagination = (
        <Row justify="space-between" align="middle" className="container">
          <div>
            <Pagination
              hideOnSinglePage={filteredEntries.length <= minPageSize}
              showSizeChanger
              pageSize={pageSize}
              current={page}
              onChange={onChangePage}
              onShowSizeChange={onChangePageSize}
              total={filteredEntries.length}
            />
          </div>
          <Spin
            spinning={loading}
            className={filteredEntries.length <= minPageSize ? "absolute" : ""}
          />
        </Row>
      );
      body = (
        <>
          {pagination}
          {filteredEntries
            .slice(
              Math.max((page - 1) * pageSize, 0),
              Math.min(page * pageSize, filteredEntries.length)
            )
            .map((entry, index) => (
              <EntryComponent
                key={`entry-${index}`}
                value={entry}
                handleDisplayNewMock={handleDisplayNewMock(entry)}
              />
            ))}
          {filteredEntries.length > minPageSize && pagination}
        </>
      );
    }
  }

  const onSort = () =>
    setEntryField(entryField === "request" ? "response" : "request");
  const onSortDate = () => setOrder(order === "asc" ? "desc" : "asc");
  const onFilter = (value: string) => {
    setPage(1);
    setFilter(value);
  };
  return (
    <div className="history" ref={ref}>
      <PageHeader
        title="History"
        extra={
          <div className="action buttons">
            <Link
              to={(location) => ({
                ...location,
                pathname: "/pages/visualize",
              })}
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
        <div>
          Entries are sorted by
          <Button onClick={onSort} type="link">
            {entryField}
          </Button>
          and the
          <Button onClick={onSortDate} type="link">
            {order === "asc" ? "oldest" : "newest"}
          </Button>
          are displayed first. Show
          <Select
            defaultValue={filter}
            bordered={false}
            showArrow={false}
            className="ant-btn-link"
            dropdownStyle={{
              minWidth: 180, // required to allow all the text to fit in the dropdown
            }}
            onChange={onFilter}
          >
            <Select.Option value="all">everything</Select.Option>
            <Select.Option value="http-errors">HTTP errors only</Select.Option>
            <Select.Option value="smocker-errors">
              Smocker errors only
            </Select.Option>
          </Select>
          .
        </div>
        <Spin delay={300} spinning={loading && historyEntries.length === 0}>
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
      historyEntries: history.list,
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
)(HistoryComponent);
