import {
  Button,
  Heading,
  HStack,
  Icon,
  Spacer,
  Text,
  VStack
} from "@chakra-ui/react";
import { RiAddFill } from "react-icons/ri";
import { Empty } from "./Empty";

const Header = () => (
  <VStack alignItems="stretch">
    <HStack justify="space-between">
      <Heading size="md">Mocks</Heading>
      <Spacer />
      <Button
        leftIcon={<Icon as={RiAddFill} boxSize="20px" />}
        colorScheme="blue"
      >
        Add Mocks
      </Button>
    </HStack>
    <Text>This is the list of declared mocks ordered by priority.</Text>
  </VStack>
);

export const Mocks = () => {
  const history = [];
  return (
    <VStack flex="1" padding="2em 7% 0" alignItems="stretch" spacing="1em">
      <Header />
      <VStack align="center">
        {history.length ? null : <Empty description="No mocks found." />}
      </VStack>
    </VStack>
  );
};
