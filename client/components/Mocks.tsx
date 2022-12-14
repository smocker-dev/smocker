import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  Spacer,
  Text,
  VStack
} from "@chakra-ui/react";
import React from "react";
import { RiAddFill } from "react-icons/ri";
import { usePaginationWithSiblings } from "../modules/pagination";
import { useMocks } from "../modules/queries";
import { GlobalStateContext } from "../modules/state";
import { Empty } from "./Empty";
import { Mock } from "./mocks/Mock";
import { Pagination } from "./Pagination";

const Header = () => {
  return (
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
};

const Mocks = () => {
  const { selectedSessionID } = React.useContext(GlobalStateContext);
  const { data, error, isFetching } = useMocks(selectedSessionID || "");
  const pageSizes = React.useMemo(() => [10, 20, 50, 100], []);
  const total = data?.length || 0;

  const {
    currentPage,
    setCurrentPage,
    previousEnabled,
    setPreviousPage,
    startIndex,
    endIndex,
    rangePages,
    nextEnabled,
    setNextPage,
    pageSize,
    setPageSize
  } = usePaginationWithSiblings({
    initTotal: total,
    initPageSize: pageSizes[0]
  });
  const mocks = data || [];
  const pagination = !error ? (
    <Pagination
      totalItems={total}
      pageSizes={pageSizes}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      previousEnabled={previousEnabled}
      setPreviousPage={setPreviousPage}
      rangePages={rangePages}
      nextEnabled={nextEnabled}
      setNextPage={setNextPage}
      pageSize={pageSize}
      setPageSize={setPageSize}
      loading={isFetching}
    />
  ) : null;
  const filteredMocks = mocks.slice(startIndex, endIndex);
  return (
    <VStack flex="1" padding="2em 7% 0" alignItems="stretch" spacing="2em">
      <Header />
      <VStack align="stretch">
        {pagination}
        {error ? (
          <Alert status="error">
            <AlertIcon boxSize="2em" />
            <Box>
              <AlertTitle>Unable to retrieve mocks</AlertTitle>
              <AlertDescription>{error?.message}</AlertDescription>
            </Box>
          </Alert>
        ) : filteredMocks.length ? (
          filteredMocks.map((mock, index) => (
            <Mock key={`mock-${index}`} mock={mock} />
          ))
        ) : (
          <Empty description="No mocks found." loading={isFetching} />
        )}
        {pagination}
      </VStack>
    </VStack>
  );
};

export default Mocks;
