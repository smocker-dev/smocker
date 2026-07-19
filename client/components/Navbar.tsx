import { Layout, Menu, Row } from "antd";
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "../assets/logo180.png";
import { cleanQueryParams } from "../modules/utils";
import "./Navbar.scss";

const Navbar = (): React.JSX.Element => {
  const location = useLocation();
  const cleaned = cleanQueryParams(location);
  const search = cleaned.search ? `?${cleaned.search}` : "";
  const items = [
    {
      key: "/pages/history",
      label: <Link to={{ pathname: "/pages/history", search }}>History</Link>,
    },
    {
      key: "/pages/mocks",
      label: <Link to={{ pathname: "/pages/mocks", search }}>Mocks</Link>,
    },
    {
      key: "documentation",
      label: (
        <a href="https://smocker.dev/" target="_blank" rel="noreferrer">
          Documentation
        </a>
      ),
    },
  ];
  return (
    <Layout.Header className="navbar">
      <Row justify="start" align="middle">
        <Link className="logo" to="/">
          <img height={42} src={Logo} />
          Smocker
        </Link>
        <Menu
          selectedKeys={[location.pathname]}
          defaultSelectedKeys={["/pages/history"]}
          className="menu"
          theme="dark"
          mode="horizontal"
          items={items}
        />
      </Row>
    </Layout.Header>
  );
};

export default Navbar;
