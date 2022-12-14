import React from "react";
import { usePagination } from "react-use-pagination";

export const DOTS = "...";
export interface PaginationProps {
  initTotal: number;
  initPageSize: number;
  siblings?: number;
}
export const usePaginationWithSiblings = ({
  initTotal,
  initPageSize,
  siblings = 2
}: PaginationProps) => {
  const {
    currentPage: currentPageIndex,
    setPage,
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
    totalItems: initTotal,
    initialPageSize: initPageSize
  });

  const currentPage = currentPageIndex + 1;

  const rangePages = React.useMemo(
    () => computeRange({ currentPage, totalPages, siblings }),
    [currentPage, totalPages, siblings]
  );

  const setCurrentPage = (page: number) => {
    page = page - 1;
    page = Math.max(page, 0);
    page = Math.min(page, totalPages);
    setPage(page);
  };

  const changePageSize = (pageSize: number) => {
    const newTotalPages = Math.ceil(initTotal / pageSize);
    let nextPage = Math.ceil((endIndex + 1) / pageSize);
    nextPage = nextPage - 1;
    nextPage = Math.max(nextPage, 0);
    nextPage = Math.min(nextPage, newTotalPages);
    setPageSize(pageSize, nextPage);
  };

  return {
    currentPage,
    setCurrentPage,
    previousEnabled,
    setPreviousPage,
    startIndex,
    endIndex: Math.min(endIndex + 1, initTotal),
    rangePages,
    nextEnabled,
    setNextPage,
    pageSize,
    setPageSize: changePageSize
  };
};

const computeRange = ({
  currentPage,
  totalPages,
  siblings
}: {
  currentPage: number;
  totalPages: number;
  siblings: number;
}) => {
  let rangePages: { text: string; value: number }[] = [];
  const firstPageIndex = 1;
  const lastPageIndex = totalPages;
  const totalPageNumbers = siblings + 5; // firstPage + lastPage + currentPage + 2 x DOTS
  if (totalPageNumbers >= totalPages) {
    rangePages = range(1, totalPages);
  }

  const leftSiblingIndex = Math.max(currentPage - siblings, firstPageIndex);
  const rightSiblingIndex = Math.min(currentPage + siblings, lastPageIndex);
  const leftItemIndex = Math.min(
    currentPage - siblings,
    lastPageIndex - siblings * 2
  );
  const rightItemIndex = Math.max(
    currentPage + siblings,
    siblings * 2 + firstPageIndex
  );

  const shouldShowLeftDots =
    leftSiblingIndex > firstPageIndex + siblings &&
    leftItemIndex - 1 > firstPageIndex; // do not display dots if surrounding pages are contiguous
  const shouldShowRightDots =
    rightSiblingIndex < lastPageIndex - siblings &&
    rightItemIndex + 1 < lastPageIndex; // do not display dots if surrounding pages are contiguous

  if (!shouldShowLeftDots && shouldShowRightDots) {
    rangePages = [
      ...range(firstPageIndex, rightItemIndex),
      { text: DOTS, value: rightItemIndex + siblings },
      { text: `${lastPageIndex}`, value: lastPageIndex }
    ];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    rangePages = [
      { text: `${firstPageIndex}`, value: firstPageIndex },
      { text: DOTS, value: leftItemIndex - siblings },
      ...range(leftItemIndex, totalPages)
    ];
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    rangePages = [
      { text: `${firstPageIndex}`, value: firstPageIndex },
      { text: DOTS, value: leftItemIndex - siblings },
      ...range(leftSiblingIndex, rightSiblingIndex),
      { text: DOTS, value: rightItemIndex + siblings },
      { text: `${lastPageIndex}`, value: lastPageIndex }
    ];
  }
  return rangePages;
};

const range = (
  start: number,
  end: number
): { text: string; value: number }[] => {
  let length = end - start + 1;
  return Array.from({ length }, (_, idx) => {
    const value = idx + start;
    return { text: `${value}`, value };
  });
};
