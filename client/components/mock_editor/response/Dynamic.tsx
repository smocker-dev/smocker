import { Select, VStack } from "@chakra-ui/react";
import React from "react";
import {
  MockDynamicEngineType,
  MockDynamicResponseType
} from "../../../modules/types";
import { Code, Language } from "../../Code";

const engines: { label: string; value: MockDynamicEngineType }[] = [
  { label: "LUA", value: "lua" },
  { label: "Go Template YAML", value: "go_template_yaml" },
  { label: "Go Template JSON", value: "go_template_json" }
];

const languageByEngine: Record<MockDynamicEngineType, Language> = {
  lua: "lua",
  go_template: "yaml",
  go_template_yaml: "yaml",
  go_template_json: "json"
};

export const DynamicEditor = ({
  response,
  onChange
}: {
  response: MockDynamicResponseType;
  onChange: (response: MockDynamicResponseType) => void;
}) => {
  const [engine, setEngine] = React.useState(response.engine);
  const [script, setScript] = React.useState(response.script);

  React.useEffect(() => {
    onChange({ engine, script });
  }, [engine, script]);

  return (
    <VStack width="100%" alignItems="stretch">
      <Select
        borderRadius="2px"
        value={engine}
        onChange={e => setEngine(e.target.value as MockDynamicEngineType)}
      >
        {engines.map(engine => (
          <option key={engine.value} value={engine.value}>
            {engine.label}
          </option>
        ))}
      </Select>
      <Code
        language={languageByEngine[engine]}
        defaultValue={script}
        collapsible={false}
        onChange={s => setScript(s)}
      />
    </VStack>
  );
};
