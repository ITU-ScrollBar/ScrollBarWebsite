import { ReactNode, useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import type { MenuProps } from 'antd';
import { ConfigProvider, Menu } from "antd";
import logo from '../../assets/images/logo.png';
import { useAuth } from "../../contexts/AuthContext";
import { MenuOutlined } from '@ant-design/icons'
import { useWindowSize } from "../../hooks/useWindowSize";
import { UserAvatar } from "../UserAvatar";
import { Loading } from "../Loading";
import { Role } from "../../types/types-file";

interface TenderMenuProps {
  children?: ReactNode;
}

type MenuItem = Required<MenuProps>['items'][number];

export const TenderMenu = ({ children }: TenderMenuProps) => {
  const [current, setCurrent] = useState('tab');
  const { currentUser, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();

  if (loading || !currentUser) {
    return <Loading />
  }

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
    || currentUser?.roles?.includes(Role.EVENT_MANAGER)
    || currentUser?.roles?.includes(Role.TENDER_MANAGER)
    || currentUser?.roles?.includes(Role.SHIFT_MANAGER)
    || currentUser?.roles?.includes(Role.BOARD)
  ) {
    const adminItems = [];
    if (currentUser?.isAdmin || currentUser?.roles?.includes(Role.EVENT_MANAGER)) {
      adminItems.push({
        label: 'Manage Events',
        key: 'admin/events',
      });
    }
    if (currentUser?.isAdmin || currentUser?.roles?.includes(Role.SHIFT_MANAGER)) {
      adminItems.push({
        label: 'Manage Shifts',
        key: 'admin/shifts',
      });
    }
    if (currentUser?.isAdmin || currentUser?.roles?.includes(Role.TENDER_MANAGER) || currentUser?.roles?.includes(Role.BOARD)) {
      adminItems.push({
        label: 'Manage Users',
        key: 'admin/users',
      });
    }
    if (currentUser?.isAdmin || currentUser?.roles?.includes(Role.BOARD)) {
      adminItems.push({
        label: 'Manage Internal Events',
        key: 'admin/internalEvents',
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
      key: 'avatar',
      label: (
        <div style={{ display: 'flex' }}>
          <UserAvatar user={currentUser} size={64} />
        </div>
      ),
      children: [
        {
          key: 'logout', 
          label: <strong onClick={() => {logout(); navigate('/')}}>Logout</strong> 
        }
      ]
    }
  ];

  const onClick: MenuProps['onClick'] = e => {
    setCurrent(e.key);
    navigate(`/${e.key}`);
  }

  return (
    <div>
      <div style={{ backgroundColor: '#202020', display: "flex", alignItems: "center", justifyContent: "space-between", height: "128px" }}>
        <div>
          <a href="/" style={{ display: "inline-block" }}>
            <img src={logo} alt="Logo" style={{ height: 128 }} />
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
            <Menu
              items={avatarMenuItems}
              mode="horizontal"
              style={{ height: '90px', display: 'flex', alignItems: 'center' }}
            />
          </ConfigProvider>
        </div>
      </div>
      {children || <Outlet />}
    </div>
  );
};
