import {
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Select,
  Switch
} from "@chakra-ui/react";
import React from "react";
import {
  asMatcher,
  defaultMatcher,
  MatcherType,
  StringMatcherType
} from "../../../modules/types";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export interface EndpointMatcherType {
  method: StringMatcherType;
  path: StringMatcherType;
}

export const Endpoint = (
  props: EndpointMatcherType & {
    onChange: (endpoint: EndpointMatcherType) => void;
  }
) => {
  const [method, setMethod] = React.useState(asMatcher(props.method).value);
  const [path, setPath] = React.useState<MatcherType>(asMatcher(props.path));
  React.useEffect(() => {
    props.onChange({
      method: { matcher: defaultMatcher, value: method },
      path
    });
  }, [method, path]);
  return (
    <FormControl display="flex" alignItems="center">
      <FormLabel htmlFor="endpoint" mb="0">
        Endpoint:
      </FormLabel>
      <InputGroup id="endpoint">
        <InputLeftAddon
          paddingRight="0"
          borderTopLeftRadius="2px"
          borderBottomLeftRadius="2px"
        >
          <Select
            variant="unstyled"
            value={method}
            onChange={e => setMethod(e.target.value)}
          >
            {methods.map(m => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </InputLeftAddon>
        <Input
          type="text"
          placeholder="/example"
          value={path.value}
          onChange={e => setPath({ ...path, value: e.target.value })}
        />
        <InputRightAddon
          borderTopRightRadius="2px"
          borderBottomRightRadius="2px"
        >
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="matcher" mb="0">
              {path.matcher === defaultMatcher ? "Raw" : "Regex"}
            </FormLabel>
            <Switch
              id="matcher"
              isChecked={path.matcher !== defaultMatcher}
              onChange={e =>
                setPath({
                  ...path,
                  matcher: e.target.checked ? "ShouldMatch" : defaultMatcher
                })
              }
            />
          </FormControl>
        </InputRightAddon>
      </InputGroup>
    </FormControl>
  );
};
