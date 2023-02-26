import {
  Button,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  VStack
} from "@chakra-ui/react";
import React from "react";
import { RiAddFill, RiDeleteBin2Fill } from "react-icons/ri";
import { v4 } from "uuid";
import {
  asMatcher,
  asMatcherSlice,
  defaultMatcher,
  MatcherType,
  MultimapMatcherType
} from "../../../modules/types";
import { allMatchers } from "../../../modules/utils";

type MatcherLine = MatcherType & { id: string; key: string };

const MatcherLine = ({
  line,
  onDelete,
  onChange
}: {
  line: MatcherLine;
  onDelete: () => void;
  onChange: (m: MatcherLine) => void;
}) => {
  const [key, setKey] = React.useState(line.key);
  const [matcher, setMatcher] = React.useState(line.matcher);
  const [value, setValue] = React.useState(line.value);

  React.useEffect(() => {
    onChange({ id: line.id, key, matcher, value });
  }, [key, matcher, value]);

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
      <Select
        borderRadius="2px"
        value={matcher}
        onChange={e => setMatcher(e.target.value)}
      >
        {allMatchers.map(m => (
          <option key={m} title={m} value={m}>
            {m}
          </option>
        ))}
      </Select>
      <Input
        borderRadius="2px"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
    </HStack>
  );
};

export const Matchers = ({
  multimap,
  name,
  onChange
}: {
  multimap: MultimapMatcherType;
  name: string;
  onChange: (multimap: MultimapMatcherType) => void;
}) => {
  const [matchers, setMatchers] = React.useState<MatcherLine[]>(
    Object.entries(multimap).flatMap(([key, values]) =>
      asMatcherSlice(values).map(v => ({ id: v4(), key, ...asMatcher(v) }))
    )
  );
  React.useEffect(() => {
    const multimap: MultimapMatcherType = {};
    matchers.forEach(matcher => {
      multimap[matcher.key] = [
        ...asMatcherSlice(multimap[matcher.key] || []),
        {
          matcher: matcher.matcher,
          value: matcher.value
        }
      ];
    });
    onChange(multimap);
  }, [matchers]);
  return (
    <FormControl>
      <FormLabel>{name}:</FormLabel>
      <VStack alignItems="stretch" flex="1">
        {matchers.map((matcher, index) => (
          <MatcherLine
            key={matcher.id}
            line={matcher}
            onDelete={() => setMatchers(matchers.filter((_, i) => i !== index))}
            onChange={matcher => {
              const newMatchers = [...matchers];
              newMatchers[index] = matcher;
              setMatchers(newMatchers);
            }}
          />
        ))}
        <Button
          leftIcon={<RiAddFill />}
          colorScheme="blue"
          variant="outline"
          borderStyle="dashed"
          onClick={() =>
            setMatchers([
              ...matchers,
              {
                id: v4(),
                key: "",
                matcher: defaultMatcher,
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
