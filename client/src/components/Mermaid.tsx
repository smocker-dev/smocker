import mermaidAPI from "mermaid";
import * as React from "react";

export const Mermaid = ({ name, chart }: any) => {
  const [diagram, setDiagram] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const cb = (svg?: string) => {
      setDiagram(svg || "");
      setError("");
    };
    try {
      mermaidAPI.parse(chart);
      mermaidAPI.initialize({ startOnLoad: false });
      mermaidAPI.render(name, chart, cb);
    } catch (e) {
      setDiagram("");
      console.error(e);
      setError(e.str || `${e}`);
    }
  }, [name, chart]);

  return (
    <div className="mermaid">
      <div dangerouslySetInnerHTML={{ __html: diagram }} />
      <div>{error}</div>
    </div>
  );
};
