import {
  ArrowLeftOutlined,
  EditOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Collapse,
  Drawer,
  Empty,
  Form,
  Input,
  Row,
  Spin,
} from "antd";
import * as React from "react";
import { Link } from "react-router-dom";
import { useHistorySummary } from "../modules/api";
import { useSession } from "../modules/session";
import { GraphHistory } from "../modules/types";
import {
  cleanQueryParams,
  useDebounce,
  useQueryParams,
} from "../modules/utils";
import Code from "./Code";
import { Mermaid } from "./Mermaid";
import PageHeader from "./PageHeader";
import "./Visualize.scss";

const EditGraph = ({
  display,
  value,
  onChange,
  onClose,
}: {
  display: boolean;
  value: string;
  onChange: (value: string) => unknown;
  onClose: () => unknown;
}) => {
  return (
    <Drawer
      title="Edit"
      placement="right"
      className="drawer"
      closable={true}
      onClose={onClose}
      open={display}
      width="50vw"
      getContainer={false}
    >
      <Form className="form">
        <Code
          language="txt"
          value={value}
          onChange={onChange}
          collapsible={false}
        />
      </Form>
    </Drawer>
  );
};

const Visualize = (): React.JSX.Element => {
  React.useEffect(() => {
    document.title = "Visualize | Smocker";
  });
  const { selected: sessionID } = useSession();
  const [queryParams, setQueryParams] = useQueryParams();

  const [diagram, setDiagram] = React.useState("");
  const [src, setSrc] = React.useState(queryParams.get("source-header") || "");
  const [dest, setDest] = React.useState(
    queryParams.get("destination-header") || "",
  );
  // Committed src/dest that actually drive the fetch (mount + Regenerate),
  // reproducing the old behavior where typing didn't refetch on its own.
  const [submitted, setSubmitted] = React.useState({ src, dest });
  const [editGraph, setEditGraph] = React.useState(false);
  const [svg, setSVG] = React.useState("");
  const debouncedDiagram = useDebounce(diagram, 1000);

  const historyQuery = useHistorySummary(
    sessionID,
    submitted.src,
    submitted.dest,
  );
  const graph: GraphHistory = historyQuery.data ?? [];
  const loading = historyQuery.isFetching;

  React.useEffect(() => {
    setDiagram(computeGraph(graph));
  }, [graph]);

  const handleChangeSrc = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQueryParams({ "source-header": event.target.value }, true);
    setSrc(event.target.value);
  };
  const handleChangeDest = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQueryParams({ "destination-header": event.target.value }, true);
    setDest(event.target.value);
  };
  const handleGenerate = () => setSubmitted({ src, dest });
  const handleEditGraph = () => setEditGraph(true);
  const handleChangeGraph = (diag: string) => setDiagram(diag);
  const handleCloseEditGraph = () => setEditGraph(false);
  const handleChangeSVG = (content: string) => {
    setSVG(content);
  };

  const onSaveSVG = () => {
    const image = "data:image/svg+xml," + escape(svg);
    const link = document.createElement("a");
    link.download = "sequence.svg";
    link.href = image;
    return link.click();
  };

  const emptyDiagram = !debouncedDiagram.replace("sequenceDiagram", "").trim();
  return (
    <div className="visualize">
      <PageHeader
        title={"Diagram of calls"}
        extra={
          <div className="action buttons">
            <Link
              to={(() => {
                const cleaned = cleanQueryParams({
                  search: window.location.search,
                });
                return {
                  pathname: "/pages/history",
                  search: cleaned.search,
                };
              })()}
            >
              <Button icon={<ArrowLeftOutlined />}>Back to History</Button>
            </Link>
            <Button icon={<SaveOutlined />} onClick={onSaveSVG}>
              Save SVG
            </Button>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleEditGraph}
            >
              Edit
            </Button>
          </div>
        }
      >
        <p className="no-margin">
          This is a graphical representation of call history.
        </p>
        <Collapse
          bordered={false}
          defaultActiveKey={[""]}
          className="collapse"
          items={[
            {
              key: "1",
              label: "Customize diagram generation",
              className: "collapse-panel",
              children: (
                <Form
                  layout="inline"
                  initialValues={{ src, dest }}
                  className="customize-form"
                >
                  <Form.Item label="Source Header" name="src">
                    <Input
                      size="small"
                      value={src}
                      onChange={handleChangeSrc}
                    />
                  </Form.Item>
                  <Form.Item label="Destination Header" name="dest">
                    <Input
                      size="small"
                      value={dest}
                      onChange={handleChangeDest}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      size="small"
                      type="primary"
                      onClick={handleGenerate}
                    >
                      Regenerate
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
        <Spin spinning={loading || diagram !== debouncedDiagram}>
          <Row className="container">
            {!emptyDiagram && (
              <Card className={"card"}>
                <Mermaid
                  name="diagram"
                  chart={debouncedDiagram}
                  onChange={handleChangeSVG}
                />
              </Card>
            )}
            {emptyDiagram && (
              <Empty description="The history of calls is empty." />
            )}
          </Row>
        </Spin>
      </PageHeader>
      {editGraph && (
        <EditGraph
          display={editGraph}
          value={diagram}
          onClose={handleCloseEditGraph}
          onChange={handleChangeGraph}
        />
      )}
    </div>
  );
};

export default Visualize;

const computeGraph = (graph: GraphHistory): string => {
  const endpoints: Record<string, string> = {};
  graph.forEach((entry) => {
    if (!endpoints[entry.from]) {
      endpoints[entry.from] = `P${Object.keys(endpoints).length}`;
    }
    if (!endpoints[entry.to]) {
      endpoints[entry.to] = `P${Object.keys(endpoints).length}`;
    }
  });

  const indent = "    ";
  let res = "sequenceDiagram\n\n";
  Object.entries(endpoints).forEach(([endpoint, alias]) => {
    res += indent + `participant ${alias} as ${endpoint}\n`;
  });
  res += "\n";
  graph.forEach((entry) => {
    let arrow = "-->>";
    if (entry.type === "request") {
      arrow = "->>+";
    } else if (entry.type === "response") {
      arrow = "-->>-";
    }
    if (entry.from === "Client") {
      res += "\n";
    }
    res +=
      indent +
      `${endpoints[entry.from]}${arrow}${endpoints[entry.to]}: ${
        entry.message
      }\n`;
  });
  return res;
};
