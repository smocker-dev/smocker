import { Row } from "antd";
import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { Actions } from "~modules/actions";
import { AppState } from "~modules/reducers";
import Code from "./Code";
import { Mermaid } from "./Mermaid";
import "./Visualize.scss";

interface Props {
  sessionID: string;
}

const Visualize = ({ sessionID }: Props) => {
  const [graph, setGraph] = React.useState(`
  sequenceDiagram
  Alice->>John: Hello John, how are you?
  John-->>Alice: Great!
  `);
  return (
    <div className="visualize">
      <Row
        type="flex"
        justify="space-between"
        align="middle"
        className="container"
      >
        <Code value={graph} onBeforeChange={setGraph} />
        <Mermaid name="diagram" chart={graph} />
      </Row>
    </div>
  );
};

export default connect(
  (state: AppState) => {
    const { sessions } = state;
    return {
      sessionID: sessions.selected,
    };
  },
  (_: Dispatch<Actions>) => ({})
)(Visualize);
