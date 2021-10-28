import { Layout, Menu, Row } from "antd";
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "../assets/logo.png";
import { cleanQueryParams } from "../modules/utils";
import "./Navbar.scss";

const Navbar = (): JSX.Element => {
  const location = useLocation();
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
        >
          <Menu.Item key="/pages/history">
            <Link
              to={(loc) => ({
                ...cleanQueryParams(loc),
                pathname: "/pages/history",
              })}
            >
              History
            </Link>
          </Menu.Item>
          <Menu.Item key="/pages/mocks">
            <Link
              to={(loc) => ({
                ...cleanQueryParams(loc),
                pathname: "/pages/mocks",
              })}
            >
              Mocks
            </Link>
          </Menu.Item>
          <Menu.Item>
            <a href="https://smocker.dev/" target="_blank" rel="noreferrer">
              Documentation
            </a>
          </Menu.Item>
        </Menu>
      </Row>
    </Layout.Header>
  );
};

export default Navbar;
