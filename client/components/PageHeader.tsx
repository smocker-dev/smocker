import { Typography } from "antd";
import * as React from "react";
import "./PageHeader.scss";

interface PageHeaderProps {
  title: React.ReactNode;
  extra?: React.ReactNode;
  children?: React.ReactNode;
}

// Page header: a title, right-aligned actions, and content below.
export const PageHeader = ({
  title,
  extra,
  children,
}: PageHeaderProps): React.JSX.Element => (
  <div className="page-header">
    <div className="page-header-heading">
      <Typography.Title level={4} className="page-header-title">
        {title}
      </Typography.Title>
      {extra && <div className="page-header-extra">{extra}</div>}
    </div>
    <div className="page-header-content">{children}</div>
  </div>
);

export default PageHeader;
