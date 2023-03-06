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
  Link,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Portal,
  Spacer,
  Text,
  useDisclosure,
  VStack
} from "@chakra-ui/react";
import { orderBy } from "lodash";
import React from "react";
import { RiOrganizationChart } from "react-icons/ri";
import { NavLink, useSearchParams } from "react-router-dom";
import { usePaginationWithSiblings } from "../modules/hooks";
import { useHistory } from "../modules/queries";
import { GlobalStateContext } from "../modules/state";
import { EntryType, MockType } from "../modules/types";
import { defaultMock, mockFromEntry } from "../modules/utils";
import { MocksDrawer } from "./Drawer";
import { Empty } from "./Empty";
import { Entry } from "./history/Entry";
import { Pagination } from "./Pagination";

const historySortFieldOptions = [
  { text: "response", value: "response" },
  { text: "request", value: "request" }
];

const historySortOrderOptions = [
  { text: "newest", value: "desc" },
  { text: "oldest", value: "asc" }
];

const historyFilterOptions = [
  { text: "everything", value: "all" },
  { text: "HTTP errors only", value: "http-errors" },
  { text: "Smocker errors only", value: "smocker-errors" }
];

const Select = ({
  value,
  options,
  onChange
}: {
  value: string;
  options: { value: string; text: string }[];
  onChange: (value: string) => void;
}) => {
  const selectedOptions = options.filter(opt => opt.value === value);
  return (
    <Menu>
      <MenuButton as={Link} colorScheme="blue">
        {selectedOptions.length > 0 ? selectedOptions[0].text : value}
      </MenuButton>
      <Portal>
        <MenuList>
          <MenuOptionGroup
            value={value}
            type="radio"
            onChange={v => onChange(v as string)}
          >
            {options.map(option => (
              <MenuItemOption key={option.value} value={option.value}>
                {option.text}
              </MenuItemOption>
            ))}
          </MenuOptionGroup>
        </MenuList>
      </Portal>
    </Menu>
  );
};

const Header = () => {
  const {
    historySortField,
    setHistorySortField,
    historySortOrder,
    setHistorySortOrder,
    historyFilter,
    setHistoryFilter
  } = React.useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();
  return (
    <VStack alignItems="stretch">
      <HStack justify="space-between">
        <Heading size="md">History</Heading>
        <Spacer />
        <NavLink
          to={{
            pathname: "/pages/visualize",
            search: searchParams.toString()
          }}
        >
          <Button
            leftIcon={<Icon as={RiOrganizationChart} boxSize="18px" />}
            colorScheme="blue"
          >
            Visualize
          </Button>
        </NavLink>
      </HStack>
      <Text>
        This is the history of the requests made during the selected session.
      </Text>
      <br />
      <HStack>
        <Text>Entries are sorted by</Text>
        <Select
          value={historySortField}
          options={historySortFieldOptions}
          onChange={setHistorySortField}
        />
        <Text>and the</Text>
        <Select
          value={historySortOrder}
          options={historySortOrderOptions}
          onChange={setHistorySortOrder}
        />
        <Text>are displayed first. Show</Text>
        <Select
          value={historyFilter}
          options={historyFilterOptions}
          onChange={setHistoryFilter}
        />
        <Text>.</Text>
      </HStack>
    </VStack>
  );
};

const History = () => {
  const {
    selectedSessionID,
    historySortField,
    historySortOrder,
    historyFilter
  } = React.useContext(GlobalStateContext);
  const { data, error, isFetching } = useHistory(selectedSessionID || "");
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

  const { isOpen, onClose, onOpen } = useDisclosure();
  const [mock, setMock] = React.useState<MockType>();

  const createMockFromEntry = (entry: EntryType) => {
    setMock(mockFromEntry(entry));
  };

  React.useEffect(() => {
    if (mock) {
      console.log(mock);
      onOpen();
    }
  }, [mock]);

  React.useEffect(() => {
    setCurrentPage(0);
  }, [historySortField, historySortOrder]);

  const history = orderBy(
    data || [],
    `${historySortField}.date`,
    historySortOrder as "asc" | "desc"
  ).filter(entry => {
    if (historyFilter === "http-errors") {
      return entry.response.status >= 400 && entry.response.status <= 599;
    }
    if (historyFilter === "smocker-errors") {
      return entry.response.status >= 600 && entry.response.status <= 699;
    }
    return true;
  });

  React.useEffect(() => {
    setTotalItems(history.length);
  }, [history]);

  const filteredHistory = history.slice(startIndex, endIndex);

  let emptyDescription = "The history is empty.";
  if (filteredHistory.length === 0) {
    if (historyFilter === "http-errors") {
      emptyDescription = "No HTTP errors in the history.";
    } else if (historyFilter === "smocker-errors") {
      emptyDescription = "No Smocker errors in the history.";
    }
  }

  const pagination =
    !error && filteredHistory.length ? (
      <Pagination
        totalItems={history.length}
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
      <Header />
      <VStack align="stretch">
        {pagination}
        {error ? (
          <Alert status="error">
            <AlertIcon boxSize="2em" />
            <Box>
              <AlertTitle>Unable to retrieve history</AlertTitle>
              <AlertDescription>{error?.message}</AlertDescription>
            </Box>
          </Alert>
        ) : filteredHistory.length ? (
          filteredHistory.map((entry, index) => (
            <Entry
              key={`entry-${index}-${entry.request.date}`}
              entry={entry}
              onCreateMock={createMockFromEntry}
            />
          ))
        ) : (
          <Empty description={emptyDescription} loading={isFetching} />
        )}
        {pagination}
      </VStack>
      <MocksDrawer
        isOpen={isOpen}
        onClose={onClose}
        initMock={mock || defaultMock}
      />
    </VStack>
  );
};

export default History;
