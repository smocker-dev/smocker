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
  PageHeader,
  Row,
  Spin,
} from "antd";
import * as React from "react";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { Dispatch } from "redux";
import { useDebounce } from "use-lodash-debounce";
import { Actions, actions } from "../modules/actions";
import { AppState } from "../modules/reducers";
import { GraphHistory } from "../modules/types";
import { cleanQueryParams, useQueryParams } from "../modules/utils";
import Code from "./Code";
import { Mermaid } from "./Mermaid";
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
      visible={display}
      width="50vw"
      getContainer={false}
    >
      <Form className="form">
        <Code
          language="txt"
          value={value}
          onBeforeChange={onChange}
          collapsible={false}
        />
      </Form>
    </Drawer>
  );
};

interface Props {
  sessionID: string;
  graph: GraphHistory;
  loading: boolean;
  visualize: (sessionID: string, src: string, dest: string) => unknown;
}

const Visualize = ({ sessionID, graph, loading, visualize }: Props) => {
  React.useEffect(() => {
    document.title = "Visualize | Smocker";
  });
  const [queryParams, setQueryParams] = useQueryParams();

  const [diagram, setDiagram] = React.useState("");
  const [src, setSrc] = React.useState(queryParams.get("source-header") || "");
  const [dest, setDest] = React.useState(
    queryParams.get("destination-header") || ""
  );
  const [editGraph, setEditGraph] = React.useState(false);
  const [svg, setSVG] = React.useState("");
  const debouncedDiagram = useDebounce(diagram, 1000);

  React.useEffect(() => {
    setDiagram(computeGraph(graph));
  }, [graph]);

  React.useLayoutEffect(() => {
    visualize(sessionID, src, dest);
  }, [sessionID]);

  const handleChangeSrc = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQueryParams({ "source-header": event.target.value }, true);
    setSrc(event.target.value);
  };
  const handleChangeDest = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQueryParams({ "destination-header": event.target.value }, true);
    setDest(event.target.value);
  };
  const handleGenerate = () => visualize(sessionID, src, dest);
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
              to={(location) => ({
                ...cleanQueryParams(location),
                pathname: "/pages/history",
              })}
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
        <Collapse bordered={false} defaultActiveKey={[""]} className="collapse">
          <Collapse.Panel
            header="Customize diagram generation"
            key="1"
            className="collapse-panel"
          >
            <Form layout="horizontal" initialValues={{ src, dest }}>
              <Row>
                <Form.Item label="Source Header" name="src">
                  <Input value={src} onChange={handleChangeSrc} />
                </Form.Item>
                <Form.Item label="Destination Header" name="dest">
                  <Input value={dest} onChange={handleChangeDest} />
                </Form.Item>
                <Button type="primary" onClick={handleGenerate}>
                  Regenerate
                </Button>
              </Row>
            </Form>
          </Collapse.Panel>
        </Collapse>
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

export default connect(
  (state: AppState) => {
    const { sessions, history } = state;
    return {
      sessionID: sessions.selected,
      graph: history.graph,
      loading: history.loading,
    };
  },
  (dispatch: Dispatch<Actions>) => ({
    visualize: (sessionID: string, src: string, dest: string) =>
      dispatch(actions.summarizeHistory.request({ sessionID, src, dest })),
  })
)(Visualize);

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
