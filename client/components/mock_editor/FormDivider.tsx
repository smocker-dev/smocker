import { Divider, HStack, Text } from "@chakra-ui/react";

interface DividerProps {
  text?: string;
}

export const FormDivider = ({ text }: DividerProps): JSX.Element => {
  if (!text) {
    return <Divider />;
  }
  return (
    <HStack>
      <Divider />
      <Text as="b" fontSize="lg" whiteSpace="nowrap">
        {text}
      </Text>
      <Divider />
    </HStack>
  );
};
