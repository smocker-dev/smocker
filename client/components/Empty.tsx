import { HStack, Icon, Spacer, Text, VStack } from "@chakra-ui/react";
import { RiEyeOffLine, RiFeedbackLine } from "react-icons/ri";

export const Empty = ({ description }: { description: string }) => (
  <VStack align="center" spacing={0}>
    <VStack align="stretch" spacing={0}>
      <HStack justify="end" marginBottom={-3} w="10em">
        <Spacer />
        <Icon as={RiFeedbackLine} boxSize="3em" color="gray.400" />
      </HStack>
      <Icon
        as={RiEyeOffLine}
        boxSize="7em"
        color="gray.400"
        alignSelf="center"
      />
    </VStack>
    <Text>{description}</Text>
  </VStack>
);
