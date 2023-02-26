import {
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Spacer,
  Spinner
} from "@chakra-ui/react";
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiMoreFill
} from "react-icons/ri";
import { DOTS } from "../modules/hooks";
import { sortNumber } from "../modules/utils";

const PageSizeSelector = ({
  options,
  pageSize,
  onChangePageSize
}: {
  options: number[];
  pageSize: number;
  onChangePageSize: (pageSize: number) => void;
}) => (
  <Box bg="white">
    <Menu matchWidth size="sm">
      <MenuButton
        as={Button}
        rightIcon={<Icon as={RiArrowDownSLine} />}
        variant="pagination"
        size="sm"
        colorScheme="blue"
      >{`${pageSize} / page`}</MenuButton>
      <MenuList>
        <MenuOptionGroup
          value={`${pageSize}`}
          type="radio"
          onChange={v => onChangePageSize(parseInt(v as string))}
        >
          {options.sort(sortNumber).map(v => (
            <MenuItemOption key={`page-size-${v}`} value={`${v}`}>
              {`${v} / page`}
            </MenuItemOption>
          ))}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  </Box>
);

interface PaginationProps {
  totalItems: number;
  pageSizes: number[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  previousEnabled: boolean;
  setPreviousPage: () => void;
  rangePages: { text: string; value: number }[];
  nextEnabled: boolean;
  setNextPage: () => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  loading?: boolean;
}

export const Pagination = ({
  totalItems,
  pageSizes,
  currentPage,
  setCurrentPage,
  previousEnabled,
  setPreviousPage,
  rangePages,
  nextEnabled,
  setNextPage,
  pageSize,
  setPageSize,
  loading
}: PaginationProps) => {
  if (!pageSizes.length || totalItems <= pageSizes[0]) {
    return <></>;
  }

  return (
    <HStack alignItems="center">
      <IconButton
        bg="white"
        isDisabled={!previousEnabled}
        variant="pagination"
        aria-label="previous page"
        colorScheme="blue"
        size="sm"
        icon={<Icon as={RiArrowLeftSLine} />}
        onClick={setPreviousPage}
      />

      {rangePages.map(({ text, value }, index) =>
        text === DOTS ? (
          <IconButton
            size="sm"
            key={`pagination-button-dots-${value}`}
            bg="white"
            aria-label={`jump to page ${value}`}
            variant="pagination"
            colorScheme="blue"
            icon={<Icon as={RiMoreFill} />}
            onClick={() => setCurrentPage(value)}
          />
        ) : (
          <Button
            size="sm"
            key={`pagination-button-page-${value}`}
            bg="white"
            aria-label={`page ${value}`}
            variant="pagination"
            colorScheme="blue"
            isDisabled={value === currentPage}
            isActive={value === currentPage}
            onClick={() => setCurrentPage(value)}
          >
            {text}
          </Button>
        )
      )}
      <IconButton
        bg="white"
        isDisabled={!nextEnabled}
        variant="pagination"
        aria-label="next page"
        colorScheme="blue"
        size="sm"
        icon={<Icon as={RiArrowRightSLine} />}
        onClick={setNextPage}
      />
      <PageSizeSelector
        options={pageSizes}
        pageSize={pageSize}
        onChangePageSize={setPageSize}
      />
      <Spacer />
      {loading && (
        <Box pr=".5em">
          <Spinner size="md" color="blue.400" />
        </Box>
      )}
    </HStack>
  );
};
