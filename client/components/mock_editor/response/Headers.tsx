import {
  Button,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  VStack
} from "@chakra-ui/react";
import React from "react";
import { RiAddFill, RiDeleteBin2Fill } from "react-icons/ri";
import { v4 } from "uuid";
import { MultimapType } from "../../../modules/types";
import { asStringArray } from "../../../modules/utils";

interface HeaderLine {
  id: string;
  key: string;
  value: string;
}

const HeaderLine = ({
  line,
  onDelete,
  onChange
}: {
  line: HeaderLine;
  onDelete: () => void;
  onChange: (m: HeaderLine) => void;
}) => {
  const [key, setKey] = React.useState(line.key);
  const [value, setValue] = React.useState(line.value);

  React.useEffect(() => {
    onChange({ id: line.id, key, value });
  }, [key, value]);

  return (
    <HStack>
      <IconButton
        aria-label="Remove Line"
        colorScheme="red"
        variant="outline"
        size="sm"
        icon={<RiDeleteBin2Fill />}
        onClick={onDelete}
      />
      <Input
        borderRadius="2px"
        value={key}
        onChange={e => setKey(e.target.value)}
      />
      <Input
        borderRadius="2px"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
    </HStack>
  );
};

export const Headers = ({
  name,
  headers: initHeaders,
  onChange
}: {
  name: string;
  headers: MultimapType;
  onChange: (headers: MultimapType) => void;
}) => {
  const [headers, setHeaders] = React.useState<HeaderLine[]>(
    Object.entries(initHeaders).flatMap(([key, value]) =>
      asStringArray(value).map(v => ({ id: v4(), key, value: v }))
    )
  );
  React.useEffect(() => {
    const multimap: MultimapType = {};
    headers.forEach(header => {
      multimap[header.key] = [...(multimap[header.key] || []), header.value];
    });
    onChange(multimap);
  }, [headers]);
  return (
    <FormControl>
      <FormLabel>{name}:</FormLabel>
      <VStack alignItems="stretch" flex="1">
        {headers.map((header, index) => (
          <HeaderLine
            key={header.id}
            line={header}
            onDelete={() => setHeaders(headers.filter((_, i) => i !== index))}
            onChange={header => {
              const newHeaders = [...headers];
              newHeaders[index] = header;
              setHeaders(newHeaders);
            }}
          />
        ))}
        <Button
          leftIcon={<RiAddFill />}
          colorScheme="blue"
          variant="outline"
          borderStyle="dashed"
          onClick={() =>
            setHeaders([
              ...headers,
              {
                id: v4(),
                key: "",
                value: ""
              }
            ])
          }
        >
          Add Field
        </Button>
      </VStack>
    </FormControl>
  );
};
