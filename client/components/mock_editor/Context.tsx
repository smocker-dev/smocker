import {
  Box,
  FormControl,
  FormLabel,
  HStack,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Switch,
  Text
} from "@chakra-ui/react";
import React from "react";
import { MockContextType } from "../../modules/types";

export const ContextEditor = ({
  context,
  onChange
}: {
  context?: MockContextType;
  onChange: (context?: MockContextType) => void;
}) => {
  const [enabled, setEnabled] = React.useState(false);
  const [times, setTimes] = React.useState<number>(context?.times || 1);

  React.useEffect(() => {
    if (!enabled) {
      onChange();
    } else {
      onChange({ times });
    }
  }, [enabled, times]);

  return (
    <HStack>
      <HStack flex="1">
        <Switch isChecked={enabled} onChange={() => setEnabled(!enabled)} />
        <FormControl
          display="flex"
          alignItems="center"
          justifyContent="start"
          width="unset"
        >
          <FormLabel htmlFor="times" mb="0" whiteSpace="nowrap">
            Limit this mock to be called:
          </FormLabel>
          <NumberInput
            id="times"
            isDisabled={!enabled}
            value={times}
            onChange={e => setTimes(+e)}
            min={1}
            defaultValue={1}
          >
            <NumberInputField borderRadius="2px" />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
        <Text>{"time(s)"}</Text>
      </HStack>
      <Box flex="2" />
    </HStack>
  );
};
