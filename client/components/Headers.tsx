import { Table, Tbody, Td, Text, Tr } from "@chakra-ui/react";
import { MultimapMatcherType, MultimapType } from "../modules/types";
import { formatHeaderValue } from "../modules/utils";

export const Headers = ({
  headers
}: {
  headers?: MultimapMatcherType | MultimapType;
}) => {
  if (!headers) {
    return <></>;
  }
  return (
    <Table size="sm" border="1px solid" borderColor="border" bgColor="gray.50">
      <Tbody>
        {Object.entries(headers).map(([key, values]) => (
          <Tr key={`header-${key}`}>
            <Td borderColor="border" wordBreak="keep-all" whiteSpace="nowrap">
              <Text fontWeight="bold">{key}</Text>
            </Td>
            <Td borderColor="border" wordBreak="break-all">
              <Text align="right">{formatHeaderValue(values)}</Text>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};
