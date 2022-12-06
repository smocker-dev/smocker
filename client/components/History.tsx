import {
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
  VStack
} from "@chakra-ui/react";
import { orderBy } from "lodash";
import React from "react";
import { RiOrganizationChart } from "react-icons/ri";
import { usePagination } from "react-use-pagination";
import { useHistory } from "../modules/queries";
import { GlobalStateContext } from "../modules/state";
import { Empty } from "./Empty";
import { Entry } from "./history/Entry";

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
      <MenuButton as={Link} color="primary">
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
  return (
    <VStack alignItems="stretch">
      <HStack justify="space-between">
        <Heading size="md">History</Heading>
        <Spacer />
        <Button
          leftIcon={<Icon as={RiOrganizationChart} boxSize="18px" />}
          colorScheme="blue"
        >
          Visualize
        </Button>
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

export const History = () => {
  const {
    selectedSessionID,
    historySortField,
    historySortOrder,
    historyFilter
  } = React.useContext(GlobalStateContext);
  const { data, error } = useHistory(selectedSessionID || "");
  let history = orderBy(
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
  const {
    currentPage,
    totalPages,
    setNextPage,
    setPreviousPage,
    nextEnabled,
    previousEnabled,
    startIndex,
    endIndex
  } = usePagination({ totalItems: history.length, initialPageSize: 10 });

  let emptyDescription = "";
  if (history.length === 0) {
    if (historyFilter === "http-errors") {
      emptyDescription = "No HTTP errors in the history.";
    } else if (historyFilter === "smocker-errors") {
      emptyDescription = "No Smocker errors in the history.";
    } else {
      emptyDescription = "The history is empty.";
    }
  }
  history = history.slice(startIndex, endIndex);
  return (
    <VStack flex="1" padding="2em 7% 0" alignItems="stretch" spacing="2em">
      <Header />
      <VStack align="stretch">
        {error ? (
          <Empty description={emptyDescription} />
        ) : history.length ? (
          history.map((entry, index) => <Entry key={index} entry={entry} />)
        ) : (
          <Empty description={emptyDescription} />
        )}
      </VStack>
    </VStack>
  );
};
