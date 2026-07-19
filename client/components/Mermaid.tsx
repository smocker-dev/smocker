import { Alert, Spin } from "antd";
import mermaid from "mermaid";
import * as React from "react";
import "./Mermaid.scss";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    primaryColor: "#e6f0ff",
    primaryBorderColor: "#1677ff",
    primaryTextColor: "#1f2328",
    lineColor: "#8c8c8c",
    textColor: "#1f2328",
    actorBkg: "#e6f0ff",
    actorBorder: "#1677ff",
    actorTextColor: "#1f2328",
    actorLineColor: "#bfbfbf",
    signalColor: "#434343",
    signalTextColor: "#434343",
    activationBkgColor: "#f0f5ff",
    activationBorderColor: "#adc6ff",
    sequenceNumberColor: "#ffffff",
    noteBkgColor: "#fffbe6",
    noteBorderColor: "#ffe58f",
    noteTextColor: "#614700",
    labelBoxBkgColor: "#e6f0ff",
    labelBoxBorderColor: "#1677ff",
    labelTextColor: "#1f2328",
  },
});

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
