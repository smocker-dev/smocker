import * as React from "react";
import { NavLink, withRouter } from "react-router-dom";
import "./Navbar.scss";
import useAxios from "axios-hooks";
import { trimedPath } from "~utils";
import Logo from "~assets/logo.png";

export const Navbar = withRouter(({ history }) => {
  const [isReseted, setReseted] = React.useState(false);
  const [{ data, loading, error }, postReset] = useAxios(
    {
      url: trimedPath + "/reset",
      method: "POST"
    },
    { manual: true }
  );
  if (data && !isReseted) {
    setReseted(true);
    history.push("/");
  }
  const reset = () => {
    setReseted(false);
    postReset();
  };
  return (
    <nav className="navbar">
      <div className="menu">
        <div className="start">
      <NavLink exact to="/" className="brand item">
        <img height={32} src={Logo} />Smocker
      </NavLink>
          <NavLink exact to="/pages/history" className="item">
            History
          </NavLink>
          <NavLink exact to="/pages/mocks" className="item">
            Mocks
          </NavLink>
        </div>
        <div className="end">
          <button
            className={loading ? "loading" : ""}
            onClick={loading ? undefined : reset}
            title={error && error.message}
          >
            Reset
          </button>
        </div>
      </div>
    </nav>
  );
});
