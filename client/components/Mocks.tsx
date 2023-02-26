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
  useDisclosure,
  VStack
} from "@chakra-ui/react";
import React from "react";
import { RiAddFill } from "react-icons/ri";
import { usePaginationWithSiblings } from "../modules/hooks";
import { useMocks, useSessions } from "../modules/queries";
import { GlobalStateContext } from "../modules/state";
import { defaultMock, sortByDate } from "../modules/utils";
import { MocksDrawer } from "./Drawer";
import { Empty } from "./Empty";
import { Mock } from "./mocks/Mock";
import { Pagination } from "./Pagination";

const Header = ({ canAddMocks }: { canAddMocks: boolean }) => {
  const { isOpen, onClose, onOpen } = useDisclosure();
  return (
    <VStack alignItems="stretch">
      <HStack justify="space-between">
        <Heading size="md">Mocks</Heading>
        <Spacer />
        {canAddMocks && (
          <Button
            leftIcon={<Icon as={RiAddFill} boxSize="20px" />}
            colorScheme="blue"
            onClick={onOpen}
          >
            Add Mocks
          </Button>
        )}
      </HStack>
      <Text>This is the list of declared mocks ordered by priority.</Text>
      <MocksDrawer isOpen={isOpen} onClose={onClose} initMock={defaultMock} />
    </VStack>
  );
};

const Mocks = () => {
  const { selectedSessionID } = React.useContext(GlobalStateContext);
  const { data, error, isFetching } = useMocks(selectedSessionID || "");
  const { data: sessions } = useSessions();
  const canAddMocks =
    !selectedSessionID ||
    selectedSessionID === sessions?.sort(sortByDate(false))?.[0]?.id;
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
    setPageSize,
    setTotalItems
  } = usePaginationWithSiblings({
    initTotal: total,
    initPageSize: pageSizes[0]
  });
  const mocks = data || [];

  React.useEffect(() => {
    setTotalItems(mocks.length);
  }, [mocks]);

  const filteredMocks = mocks.slice(startIndex, endIndex);

  const pagination =
    !error && filteredMocks.length ? (
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
  return (
    <VStack flex="1" padding="2em 7% 0" alignItems="stretch" spacing="2em">
      <Header canAddMocks={canAddMocks} />
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
            <Mock key={`mock-${index}-${mock.state?.id}`} mock={mock} />
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
