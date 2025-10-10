import { ReactNode, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import type { MenuProps } from 'antd';
import { ConfigProvider, Dropdown, Menu } from "antd";
import logo from '../../assets/images/logo.png';
import avatar from '../../assets/images/avatar.png';
import { useAuth } from "../../contexts/AuthContext";
import MenuContext from "antd/es/menu/MenuContext";

interface TenderMenuProps {
  children?: ReactNode;
}
interface UserProfile {
  displayName: string;
  photoUrl: string;
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
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const userProfile: UserProfile | null = currentUser
  ? {
    displayName: currentUser.displayName ?? "No username",
    photoUrl: (currentUser as any).photoUrl ?? avatar
  }
  : null;
  
  const avatarMenuItems: MenuItem[] = [
    {
      key: 'logout', 
      label: <strong onClick={logout}>Logout</strong> 
    },
    {
      key: 'profile',
      label: <strong onClick={() => navigate('/members/profile')}>Profile</strong>
    }
  ];
  
  const onClick: MenuProps['onClick'] = e => {
    setCurrent(e.key);
    navigate(`/${e.key}`);
  }

  return (
    <div>
      <div style={{ backgroundColor: '#2E2E2E', display: "flex", alignItems: "center", justifyContent: "space-between", height: "150px" }}>
        <div>
          <a href="/" style={{ display: "inline-block" }}>
            <img src={logo} alt="Logo" style={{ height: 150 }} />
          </a>
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
          <Dropdown menu={{ items: avatarMenuItems }}>
            <img
              src={userProfile?.photoUrl ? userProfile.photoUrl : avatar}
              alt={userProfile?.photoUrl && userProfile.displayName ? userProfile.displayName : "default avatar"}
              style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", marginRight: 24 }}
            />
          </Dropdown>
        </div>
      </div>
      {children || <Outlet />}
    </div>
  );
};
