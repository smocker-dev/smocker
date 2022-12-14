import { Card, CardBody, Code, HStack } from "@chakra-ui/react";
import { MockType } from "../../modules/types";

export const Mock = ({ mock }: { mock: MockType }) => (
  <Card bg="white" variant="outline" borderRadius="sm">
    <CardBody>
      <HStack spacing="1em" align="stretch">
        <Code>{JSON.stringify(mock, null, 2)}</Code>
      </HStack>
    </CardBody>
  </Card>
);
