import { ReactNode, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import type { MenuProps } from 'antd';
import { Avatar, ConfigProvider, Dropdown, Menu } from "antd";
import logo from '../../assets/images/logo.png';
import avatar from '../../assets/images/avatar.png';
import { useAuth } from "../../contexts/AuthContext";
import { MenuOutlined } from '@ant-design/icons'
import { useWindowSize } from "../../hooks/useWindowSize";

interface TenderMenuProps {
  children?: ReactNode;
}

type MenuItem = Required<MenuProps>['items'][number];

export const TenderMenu = ({ children }: TenderMenuProps) => {
  const [current, setCurrent] = useState('tab');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const windowSize = useWindowSize();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(windowSize.width < 768);
  }, [windowSize]);

  const items: MenuItem[] = [
    {
      label: 'My shifts',
      key: 'members/profile',    
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

  if (
    currentUser?.isAdmin 
    || currentUser?.roles.includes('tender_manager')
    || currentUser?.roles.includes('shift_manager')
    || currentUser?.roles.includes('user_manager')
  ) {
    const adminItems = [];
    if (currentUser?.isAdmin || currentUser?.roles.includes('tender_manager')) {
      adminItems.push({
        label: 'Manage Events',
        key: 'admin/events',
      });
    }
    if (currentUser?.isAdmin || currentUser?.roles.includes('shift_manager')) {
      adminItems.push({
        label: 'Manage Shifts',
        key: 'admin/shifts',
      });
    }
    if (currentUser?.isAdmin || currentUser?.roles.includes('user_manager')) {
      adminItems.push({
        label: 'Manage Users',
        key: 'admin/users',
      });
    }
    if (currentUser?.isAdmin) {
      adminItems.push({
        label: 'System Settings',
        key: 'admin/settings',
      });
    }
    items.push({ label: 'Admin', key: 'admin', children: adminItems });
  }

  useEffect(() => {
    const currentPage = items.find(item => item?.key?.toString() && location.pathname.endsWith(item?.key?.toString()));
    if (currentPage) {
      setCurrent(currentPage.key as string);
    } else {
      setCurrent(''); // Navigating to a route not in the menu
    }
  }, [location.pathname, items]);
  
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
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: '0 16px' }}>
          <ConfigProvider
            theme={{
              components: {
                Menu: {
                  itemColor: 'white',
                  popupBg: '#2E2E2E',
                  itemBg: 'transparent',
                  horizontalItemSelectedColor: "transparent",
                },
              }
            }}
          >
            <Menu
              style={{ fontWeight: "bold", fontSize: 18, minWidth: 0, flex: "auto", maxWidth: 'calc(100vw - 324px)' }}
              onClick={onClick}
              items={items}
              disabledOverflow={!isMobile}
              overflowedIndicator={<MenuOutlined style={{ color: 'white', fontSize: '24px' }} />}
              selectedKeys={[current]}
              mode="horizontal"
            />
          </ConfigProvider>
          <Dropdown menu={{ items: avatarMenuItems }}>
            <Avatar
              size={96}
              src={currentUser?.photoUrl ? currentUser.photoUrl : avatar}
              alt={currentUser?.photoUrl && currentUser.displayName ? currentUser.displayName : "default avatar"}
            />
          </Dropdown>
        </div>
      </div>
      {children || <Outlet />}
    </div>
  );
};
