import {
  Box,
  HStack,
  Icon,
  Spacer,
  Spinner,
  Text,
  VStack
} from "@chakra-ui/react";
import { RiEyeOffLine, RiFeedbackLine } from "react-icons/ri";

export const Empty = ({
  description,
  loading = false
}: {
  description: string;
  loading?: boolean;
}) => {
  return (
    <VStack align="center" spacing={0}>
      {loading ? (
        <Box pt={10}>
          <Spinner
            thickness="5px"
            color="gray.400"
            boxSize="5em"
            alignSelf="center"
          />
        </Box>
      ) : (
        <>
          <VStack align="stretch" spacing={0} className="empty">
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
        </>
      )}
    </VStack>
  );
};