import { HStack, Icon, Image, Link, Text } from "@chakra-ui/react";
import { RiExternalLinkFill } from "react-icons/ri";
import { NavLink, useSearchParams } from "react-router-dom";
import logo from "../assets/logo180.png";

const Logo = () => (
  <HStack align="center" pl="4em" pr="2">
    <Image boxSize="32px" src={logo} />
    <NavLink to="/pages/history">
      <Text
        fontWeight="900"
        color="white"
        style={{
          fontVariant: "small-caps"
        }}
      >
        Smocker
      </Text>
    </NavLink>
  </HStack>
);

const Item = (props: { to?: string; label: string; href?: string }) => {
  const [searchParams] = useSearchParams();

  if (props.href) {
    return (
      <Link
        href={props.href}
        isExternal
        display="flex"
        alignItems="center"
        color="gray.400"
        _hover={{
          color: "white",
          textDecoration: "underline"
        }}
      >
        <Text pl="5" fontWeight="600">
          {props.label}
        </Text>
        <Icon as={RiExternalLinkFill} mx="2px" />
      </Link>
    );
  }
  const params = searchParams.toString();
  const to = (props.to || "") + (params ? `?${params}` : "");
  return (
    <NavLink
      to={to}
      style={{
        display: "flex",
        alignItems: "stretch"
      }}
    >
      {({ isActive }) => (
        <Link
          display="flex"
          alignItems="center"
          backgroundColor={isActive ? "blue.400" : undefined}
          color={isActive ? "white" : "gray.400"}
          _hover={{
            color: "white"
          }}
          as="div"
        >
          <Text pl="5" pr="5" fontWeight="600">
            {props.label}
          </Text>
        </Link>
      )}
    </NavLink>
  );
};

const Navbar = () => {
  return (
    <HStack align="stretch" minHeight="100%" bg="navbar">
      <Logo />
      <HStack align="stretch" spacing={0}>
        <Item label="History" to="/pages/history" />
        <Item label="Mocks" to="/pages/mocks" />
        <Item label="Documentation" href="https://smocker.dev/" />
      </HStack>
    </HStack>
  );
};

export default Navbar;
