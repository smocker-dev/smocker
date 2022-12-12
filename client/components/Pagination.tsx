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
  MenuOptionGroup
} from "@chakra-ui/react";
import React from "react";
import {
  RiArrowDownSLine,
  RiArrowLeftSLine,
  RiArrowRightSLine
} from "react-icons/ri";
import { usePagination } from "react-use-pagination";

const DOTS = "...";

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
        variant="outline"
        size="sm"
        colorScheme="blue"
      >{`${pageSize} / page`}</MenuButton>
      <MenuList>
        <MenuOptionGroup
          value={`${pageSize}`}
          type="radio"
          onChange={v => onChangePageSize(parseInt(v as string))}
        >
          {options
            .sort((a, b) => a - b)
            .map(v => (
              <MenuItemOption key={`page-size-${v}`} value={`${v}`}>
                {`${v} / page`}
              </MenuItemOption>
            ))}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  </Box>
);

export interface PaginationProps {
  total: number;
  pageSizes: number[];
  siblings?: number;
  onChangePage?: (startIndex: number, endIndex: number) => void;
}

export const Pagination = ({
  total,
  pageSizes,
  siblings = 1,
  onChangePage
}: PaginationProps) => {
  if (!pageSizes.length || total <= pageSizes.sort()[0]) {
    <></>;
  }

  pageSizes = pageSizes.sort((a, b) => a - b);

  const {
    currentPage: currentPageIndex,
    totalPages,
    setNextPage,
    setPreviousPage,
    nextEnabled,
    previousEnabled,
    startIndex,
    endIndex,
    pageSize,
    setPageSize
  } = usePagination({
    totalItems: total,
    initialPageSize: pageSizes[0]
  });

  React.useEffect(() => {
    onChangePage?.(startIndex, endIndex);
  }, [startIndex, endIndex]);

  const range = (start: number, end: number): any[] => {
    let length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
  };

  let rangePage: number | string[] = [];
  const currentPage = currentPageIndex + 1;

  const firstPageIndex = 1;
  const lastPageIndex = totalPages;
  const totalPageNumbers = siblings + 5; // firstPage + lastPage + currentPage + 2 x DOTS
  if (totalPageNumbers >= totalPages) {
    rangePage = range(1, totalPages);
  }
  const leftSiblingIndex = Math.max(currentPage - siblings, 1);
  const rightSiblingIndex = Math.min(currentPage + siblings, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > firstPageIndex + siblings;
  const shouldShowRightDots = rightSiblingIndex < lastPageIndex - siblings;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    rangePage = [
      ...range(firstPageIndex, currentPage + siblings),
      DOTS,
      lastPageIndex
    ];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    rangePage = [
      firstPageIndex,
      DOTS,
      ...range(currentPage - siblings, totalPages)
    ];
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    rangePage = [
      firstPageIndex,
      DOTS,
      ...range(leftSiblingIndex, rightSiblingIndex),
      DOTS,
      lastPageIndex
    ];
  }

  return (
    <HStack>
      <IconButton
        bg="white"
        isDisabled={!previousEnabled}
        variant="outline"
        aria-label="previous page"
        colorScheme="blue"
        size="sm"
        icon={<Icon as={RiArrowLeftSLine} />}
        onClick={setPreviousPage}
      />

      {rangePage.map((value, index) => (
        <Button
          size="sm"
          key={`page-${index}`}
          bg="white"
          variant="outline"
          colorScheme="blue"
          isDisabled={value === "..." || `${value}` === `${currentPage}`}
        >
          {value}
        </Button>
      ))}
      <IconButton
        bg="white"
        isDisabled={!nextEnabled}
        variant="outline"
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
    </HStack>
  );
};
