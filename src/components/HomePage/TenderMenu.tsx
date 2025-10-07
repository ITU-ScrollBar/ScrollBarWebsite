import { ReactNode, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import type { MenuProps } from 'antd';
import { ConfigProvider, Menu } from "antd";
import logo from '../../assets/images/logo.png';
import avatar from '../../assets/images/avatar.png';
import { useAuth } from "../../contexts/AuthContext";

interface TenderMenuProps {
  children?: ReactNode;
}

type MenuItem = Required<MenuProps>['items'][number];

const items: MenuItem[] = [
  {
    label: 'My shifts',
    key: 'tenders/shifts',    
  },
  {
    label: 'All shifts',
    key: 'tenders/allshifts',
  },
  {
    label: "Up for grabs",
    key: 'tenders/upforgrabs',
  }
];

export const TenderMenu = ({ children }: TenderMenuProps) => {
  const [current, setCurrent] = useState('tab');
  const { currentUser } = useAuth();

  const navigate = useNavigate();
  
  const onClick: MenuProps['onClick'] = e => {
    setCurrent(e.key);
    navigate(`/${e.key}`);
  }

  return (
    <div>
      <div style={{ backgroundColor: '#2E2E2E', display: "flex", alignItems: "center", justifyContent: "space-between", height: "150px" }}>
        <div>
          <img src={logo} alt="Logo" style={{ height: 150 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ConfigProvider
            theme={{
              components: {
                Menu: {
                  itemColor: 'white',
                  horizontalItemSelectedColor: "transparent",
                },
              }
            }}
          >
            <Menu
              style={{ backgroundColor: "transparent", color: "white", fontWeight: "bold", fontSize: 18 }}
              onClick={onClick}
              disabledOverflow
              items={items}
              selectedKeys={[current]}
              mode="horizontal"
            />
          </ConfigProvider>
          <img
            src={currentUser?.photoURL ?? avatar}
            alt={currentUser?.displayName ?? "avatar"}
            style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", marginRight: 24 }}
          />
        </div>
      </div>
      {children || <Outlet />}
    </div>
  );
};
