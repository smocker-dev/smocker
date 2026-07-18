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
  Pagination,
  Row,
  Select,
  Spin,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { orderBy } from "es-toolkit";
import { getReasonPhrase } from "http-status-codes";
import { dump } from "js-yaml";
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLocalStorage } from "usehooks-ts";
import { useHistory, useSessionsSummary } from "../modules/api";
import { useSession } from "../modules/session";
import { dateFormat, Entry, SmockerError } from "../modules/types";
import {
  cleanupRequest,
  cleanupResponse,
  entryToCurl,
  formatQueryParams,
  scrollToPage,
  useQueryParams,
} from "../modules/utils";
import Code from "./Code";
import "./History.scss";
import NewMock from "./NewMock";
import PageHeader from "./PageHeader";

const TableRow = ([key, values]: [string, string[]]) => (
  <tr key={key}>
    <td>{key}</td>
    <td>{values.join(", ")}</td>
  </tr>
);

const newMockFromEntry = (entry: Entry): string => {
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
  return dump([{ request, response }]);
};

const EntryComponent = React.memo(
  ({
    value,
    onCreateMock,
  }: {
    value: Entry;
    onCreateMock: (mock: string) => void;
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
                  TableRow(entry),
                )}
              </tbody>
            </table>
          )}
          {value.request.body ? (
            <Code
              value={
                JSON.stringify(value.request.body, null, "  ") ||
                `${value.request.body}`
              }
              language="json"
            />
          ) : null}
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
            {value.response.status >= 600 && (
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
            <Button
              block
              type="dashed"
              onClick={() => onCreateMock(newMockFromEntry(value))}
            >
              <PlusCircleOutlined />
              {value.response.status >= 600
                ? "Create a new mock from request"
                : "Create a new mock from entry"}
            </Button>
          </Typography.Paragraph>
          {value.response.headers && (
            <table>
              <tbody>
                {Object.entries(value.response.headers).map((entry) =>
                  TableRow(entry),
                )}
              </tbody>
            </table>
          )}
          {value.response.body ? (
            <Code
              value={
                JSON.stringify(value.response.body, null, "  ") ||
                `${value.response.body}`
              }
              language="json"
            />
          ) : null}
          {value.context.delay && (
            <Typography.Paragraph className="delay">
              This response was delayed by <span>{value.context.delay}</span>
            </Typography.Paragraph>
          )}
        </div>
      </div>
    );
  },
);
EntryComponent.displayName = "Entry";

const HistoryComponent = (): React.JSX.Element => {
  React.useEffect(() => {
    document.title = "History | Smocker";
  });

  const { selected: sessionID } = useSession();
  const { data: sessions = [] } = useSessionsSummary();
  const canPoll =
    !sessionID ||
    (sessions.length > 0 && sessionID === sessions[sessions.length - 1].id);

  const location = useLocation();

  // Filters and order
  const [order, setOrder] = useLocalStorage("history.order.by.date", "desc");
  const [entryField, setEntryField] = useLocalStorage(
    "history.order.by.entry.field",
    "response",
  );
  const [filter, setFilter] = useLocalStorage("history.filter", "all");

  // Pagination — kept in the URL query (?page, ?page-size) so a given page is shareable.
  const minPageSize = 10;
  const [queryParams, setQueryParams] = useQueryParams();
  const page = Math.max(1, Number(queryParams.get("page")) || 1);
  const pageSize = Number(queryParams.get("page-size")) || minPageSize;
  const setPage = (p: number) => setQueryParams({ page: String(p) });
  const setPageAndSize = (p: number, ps: number) =>
    setQueryParams({ page: String(p), "page-size": String(ps) });
  const [polling, setPolling] = React.useState(false);

  // Mock creation drawer opened in place from an entry (no navigation to the Mocks page).
  const [newMockValue, setNewMockValue] = React.useState<string | null>(null);
  const handleCreateMock = React.useCallback(
    (mock: string) => setNewMockValue(mock),
    [],
  );

  const historyQuery = useHistory(sessionID, {
    refetchInterval: polling ? 10000 : false,
  });
  const historyEntries = historyQuery.data ?? [];
  const loading = historyQuery.isFetching;
  const error = historyQuery.error;

  const togglePolling = () => setPolling((p) => !p);

  const ref = React.useRef<HTMLDivElement>(null);
  const prevPageRef = React.useRef(page);
  const prevPageSizeRef = React.useRef(pageSize);
  React.useLayoutEffect(() => {
    const sizeChanged = pageSize !== prevPageSizeRef.current;
    const goingBack = !sizeChanged && page < prevPageRef.current;
    prevPageRef.current = page;
    prevPageSizeRef.current = pageSize;
    return scrollToPage(ref.current, goingBack);
  }, [page, pageSize]);

  let body = null;
  if (error) {
    body = <Alert message={error.message} type="error" showIcon />;
  } else {
    const filteredEntries = orderBy(
      historyEntries,
      [
        (entry) =>
          entryField === "request" ? entry.request.date : entry.response.date,
      ],
      [order as "asc" | "desc"],
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
      const onChangePage = (p: number) => setPage(p);
      const onChangePageSize = (p: number, ps: number) => setPageAndSize(p, ps);
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
              Math.min(page * pageSize, filteredEntries.length),
            )
            .map((entry, index) => (
              <EntryComponent
                key={`entry-${index}`}
                value={entry}
                onCreateMock={handleCreateMock}
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
  const filterOptions = [
    { value: "all", label: "everything" },
    { value: "http-errors", label: "HTTP errors only" },
    { value: "smocker-errors", label: "Smocker errors only" },
  ];
  return (
    <div className="history" ref={ref}>
      <PageHeader
        title="History"
        extra={
          <div className="action buttons">
            <Link
              to={{ pathname: "/pages/visualize", search: location.search }}
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
            variant="borderless"
            className="ant-btn-link"
            // Drop the dropdown caret so this renders as an inline link within the sentence.
            suffixIcon={null}
            popupMatchSelectWidth={180}
            onChange={onFilter}
            options={filterOptions}
          />
          .
        </div>
        <Spin delay={300} spinning={loading && historyEntries.length === 0}>
          {body}
        </Spin>
      </PageHeader>
      {newMockValue !== null && (
        <NewMock
          defaultValue={newMockValue}
          onClose={() => setNewMockValue(null)}
        />
      )}
    </div>
  );
};

export default HistoryComponent;
