import { Box, Card, CardBody, HStack } from "@chakra-ui/react";
import { EntryType } from "../../modules/types";
import { Request } from "./Request";
import { Response } from "./Response";

export const Entry = ({
  entry,
  onCreateMock
}: {
  entry: EntryType;
  onCreateMock: (entry: EntryType) => void;
}) => {
  return (
    <Card bg="white" variant="outline" borderRadius="sm">
      <CardBody>
        <HStack spacing="1em" align="stretch">
          <Request request={entry.request} />
          <Box borderRight="1px dashed" borderRightColor="border" width="1px" />
          <Response
            response={entry.response}
            context={entry.context}
            onCreateMock={() => onCreateMock(entry)}
          />
        </HStack>
      </CardBody>
    </Card>
  );
};
