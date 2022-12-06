import { Box, Card, CardBody, HStack } from "@chakra-ui/react";
import { EntryType } from "../../modules/types";
import { Request } from "./Request";
import { Response } from "./Response";

const Divider = () => (
  <Box borderRight="1px dashed" borderRightColor="sidebar.border" width="1px" />
);

export const Entry = ({ entry }: { entry: EntryType }) => (
  <Card bg="white" variant="outline" borderRadius="2px">
    <CardBody>
      <HStack spacing="1em" align="stretch">
        <Request request={entry.request} />
        <Divider />
        <Response response={entry.response} context={entry.context} />
      </HStack>
    </CardBody>
  </Card>
);
