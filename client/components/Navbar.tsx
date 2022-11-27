import { HStack, Icon, Image, Link, Text, useToken } from "@chakra-ui/react";
import { RiExternalLinkFill } from "react-icons/ri";
import { NavLink, useSearchParams } from "react-router-dom";
import logo from "../assets/logo180.png";

const Logo = () => (
  <HStack align="center" pl="4em" pr="2">
    <Image boxSize="32px" src={logo} />
    <NavLink to="/">
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
  const [primary, whiteLight, greyDark] = useToken(
    // the key within the theme, in this case `theme.colors`
    "colors",
    // the subkey(s), resolving to `theme.colors.red.100`
    ["primary", "white.light", "grey.dark"]
  );

  if (props.href) {
    return (
      <Link
        href={props.href}
        isExternal
        display="flex"
        alignItems="center"
        color="grey.dark"
        _hover={{
          color: "white.light",
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
          backgroundColor={isActive ? "primary" : undefined}
          color={isActive ? "white.light" : "grey.dark"}
          _hover={{
            color: "white.light"
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

export const Navbar = () => {
  return (
    <HStack align="stretch" minHeight="100%" bg="navy.dark">
      <Logo />
      <HStack align="stretch" spacing={0}>
        <Item label="History" to="/pages/history" />
        <Item label="Mocks" to="/pages/mocks" />
        <Item label="Documentation" href="https://smocker.dev/" />
      </HStack>
    </HStack>
  );
};
