import { HStack, Icon, Spacer, Text, VStack } from "@chakra-ui/react";
import { RiEyeOffLine, RiFeedbackLine } from "react-icons/ri";

export const Empty = ({ text }: { text: string }) => (
  <VStack align="stretch" spacing={0}>
    <HStack justify="end" marginBottom={-3}>
      <Spacer />
      <Icon as={RiFeedbackLine} boxSize="3em" color="gray.300" />
    </HStack>
    <Icon as={RiEyeOffLine} boxSize="7em" color="gray.300" alignSelf="center" />
    <Text>{text}</Text>
  </VStack>
);
