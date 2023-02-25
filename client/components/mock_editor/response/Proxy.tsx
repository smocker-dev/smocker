import {
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Switch,
  Tooltip,
  VStack
} from "@chakra-ui/react";
import React from "react";
import { RiQuestionLine } from "react-icons/ri";
import { MockProxyType } from "../../../modules/types";
import { Headers } from "./Headers";

export const ProxyEditor = ({
  response,
  onChange
}: {
  response: MockProxyType;
  onChange: (response: MockProxyType) => void;
}) => {
  const [host, setHost] = React.useState(response.host);
  const [headers, setHeaders] = React.useState(response.headers || {});
  const [followRedirect, setFollowRedirect] = React.useState(
    response.follow_redirect
  );
  const [skipVerifyTls, setSkipVerifyTls] = React.useState(
    response.skip_verify_tls
  );
  const [keepHost, setKeepHost] = React.useState(response.keep_host);

  React.useEffect(() => {
    onChange({
      host,
      headers,
      follow_redirect: followRedirect,
      skip_verify_tls: skipVerifyTls,
      keep_host: keepHost
    });
  }, [host, headers, followRedirect, skipVerifyTls, keepHost]);

  return (
    <HStack width="100%" alignItems="start" spacing={10}>
      <VStack flex="1">
        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="host" mb="0">
            Host:
          </FormLabel>
          <Input
            id="host"
            placeholder="https://example.com"
            value={host}
            onChange={e => setHost(e.target.value)}
          />
        </FormControl>
        <Headers
          name="Additional Headers"
          headers={headers}
          onChange={h => setHeaders(h)}
        />
      </VStack>
      <VStack flex="1">
        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Follow HTTP Redirections:</FormLabel>
          <Switch
            isChecked={Boolean(followRedirect)}
            onChange={() => setFollowRedirect(!followRedirect)}
          />
        </FormControl>
        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0" position="relative">
            Skip TLS Verification
            <Tooltip
              hasArrow
              label="Useful is the host uses a self-signed certificate"
              placement="top"
            >
              <span>
                <Icon as={RiQuestionLine} />
              </span>
            </Tooltip>
            :
          </FormLabel>
          <Switch
            isChecked={Boolean(skipVerifyTls)}
            onChange={() => setSkipVerifyTls(!skipVerifyTls)}
          />
        </FormControl>
        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Forward Client Host Header:</FormLabel>
          <Switch
            isChecked={Boolean(keepHost)}
            onChange={() => setKeepHost(!keepHost)}
          />
        </FormControl>
      </VStack>
    </HStack>
  );
};
