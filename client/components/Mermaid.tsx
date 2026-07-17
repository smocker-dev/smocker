import { Alert, Spin } from "antd";
import mermaid from "mermaid";
import * as React from "react";
import "./Mermaid.scss";

mermaid.initialize({ startOnLoad: false });

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
}): React.JSX.Element => {
  const [diagram, setDiagram] = React.useState("");
  const [error, setError] = React.useState("");
  const [spinner, setSpinner] = React.useState(Boolean(loading));

  React.useEffect(() => {
    let cancelled = false;
    setSpinner(true);
    (async () => {
      try {
        await mermaid.parse(chart);
        const { svg } = await mermaid.render(name, chart);
        if (cancelled) {
          return;
        }
        setSpinner(false);
        setDiagram(svg);
        setError("");
        if (onChange) {
          onChange(svg);
        }
      } catch (e) {
        if (cancelled) {
          return;
        }
        setSpinner(false);
        setDiagram("");
        console.error(e);
        setError(`${e}`);
      }
    })();
    return () => {
      cancelled = true;
    };
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
