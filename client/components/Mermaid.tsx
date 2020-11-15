import { Alert, Spin } from "antd";
import mermaidAPI from "mermaid";
import * as React from "react";
import "./Mermaid.scss";

export const Mermaid = ({
  name,
  chart,
  loading,
  onChange,
}: {
  name: string;
  chart: string;
  loading?: boolean;
  onChange?: (svg: string) => unknown;
}): JSX.Element => {
  const [diagram, setDiagram] = React.useState("");
  const [error, setError] = React.useState("");
  const [spinner, setSpinner] = React.useState(Boolean(loading));

  React.useEffect(() => {
    setSpinner(true);
    const cb = (svg = "") => {
      setSpinner(false);
      setDiagram(svg);
      setError("");
      onChange && onChange(svg);
    };
    setTimeout(() => {
      try {
        mermaidAPI.parse(chart);
        mermaidAPI.initialize({ startOnLoad: false });
        mermaidAPI.render(name, chart, cb);
      } catch (e) {
        setDiagram("");
        console.error(e);
        setError(e.str || `${e}`);
      }
    }, 1);
  }, [name, chart]);

  return (
    <Spin spinning={spinner}>
      <div className="mermaid">
        <div dangerouslySetInnerHTML={{ __html: diagram }} />
        {error && (
          <Alert
            message="Unable to render"
            description={error}
            type="error"
            showIcon
          />
        )}
      </div>
    </Spin>
  );
};
