import {
  Box,
  Card,
  CardBody,
  HStack,
  Icon,
  IconButton,
  Link,
  Spacer,
  Text,
  VStack
} from "@chakra-ui/react";
import dayjs from "dayjs";
import { RiLockFill, RiLockUnlockFill } from "react-icons/ri";
import { dateFormat, MockStateType, MockType } from "../../modules/types";
import { Request } from "./Request";
import { DynamicResponse, ProxyResponse, Response } from "./Response";

const Header = ({ state }: { state: MockStateType }) => (
  <HStack
    borderBottom="1px dashed"
    borderBottomColor="border"
    fontSize="sm"
    pb={3}
  >
    <HStack>
      {state.locked ? (
        <IconButton
          variant="outline"
          aria-label="unlock mock"
          colorScheme="red"
          size="sm"
          icon={<Icon as={RiLockUnlockFill} />}
        />
      ) : (
        <IconButton
          variant="outline"
          aria-label="lock mock"
          colorScheme="blue"
          size="sm"
          icon={<Icon as={RiLockFill} />}
        />
      )}
      <Text fontWeight="bold">ID:</Text>
      <Link colorScheme="blue">{state.id}</Link>
    </HStack>
    <Spacer />
    <Text fontWeight="bold">
      {dayjs(state.creation_date).format(dateFormat)}
    </Text>
  </HStack>
);

export const Mock = ({ mock }: { mock: MockType }) => (
  <Card bg="white" variant="outline" borderRadius="sm">
    <CardBody>
      <VStack align="stretch" spacing={3}>
        <Header state={mock.state} />
        <HStack spacing="1em" align="stretch">
          <Request request={mock.request} />
          <Box borderRight="1px dashed" borderRightColor="border" width="1px" />
          <Box width="calc(50% - 1em)" pt={1}>
            {mock.response && <Response mock={mock} />}
            {mock.dynamic_response && <DynamicResponse mock={mock} />}
            {mock.proxy && <ProxyResponse mock={mock} />}
          </Box>
        </HStack>
      </VStack>
    </CardBody>
  </Card>
);
