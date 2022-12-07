import { Box, Icon, Link } from "@chakra-ui/react";
import { RiBookOpenLine, RiGithubFill } from "react-icons/ri";

export const Footer = () => (
  <Box
    p="0 24px 24px"
    display="flex"
    alignItems="center"
    flexDirection="column"
  >
    <Box style={{ textAlign: "center" }}>
      Smocker version {window.version} &ndash; MIT Licensed
    </Box>
    <Box display="flex" flexDirection="row" alignItems="center">
      <Link
        href="https://github.com/smocker-dev/smocker"
        title="Smocker on GitHub"
        colorScheme="blue"
        isExternal
      >
        <Icon as={RiGithubFill} boxSize="16px" />
      </Link>
      <Link
        href="https://smocker.dev"
        title="Smocker Documentation"
        colorScheme="blue"
        isExternal
        mx="1"
      >
        <Icon as={RiBookOpenLine} boxSize="16px" />
      </Link>
    </Box>
  </Box>
);
