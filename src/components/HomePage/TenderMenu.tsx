import { ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { MenuProps } from 'antd';
import { ConfigProvider, Menu } from "antd";
import logo from '../../assets/images/logo.png';
import { useAuth } from "../../contexts/AuthContext";
import { MenuOutlined } from '@ant-design/icons'
import { useWindowSize } from "../../hooks/useWindowSize";
import { UserAvatar } from "../UserAvatar";
import { Loading } from "../Loading";
import { Role } from "../../types/types-file";
import useSettings from "../../hooks/useSettings";

interface TenderMenuProps {
  children?: ReactNode;
}

type MenuItem = Required<MenuProps>['items'][number];

export const TenderMenu = ({ children }: TenderMenuProps) => {
  const { currentUser, loading, logout } = useAuth();
  const { settingsState } = useSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isMobile } = useWindowSize();
  const getHelpLabel = settingsState.settings.getHelpTitle || "Get help";

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
    },
    {
      label: getHelpLabel,
      key: 'tenders/gethelp',
    }
  ];

  if (loading || !currentUser) {
    return <Loading />
  }

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
      },
      {
        label: "Board Management",
        key: "admin/board",
      });
    }
    items.push({ label: 'Admin', key: 'admin', children: adminItems });
  }

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
    navigate(`/${e.key}`);
  }

  const currentPage = items.find((item) => item?.key?.toString() && pathname.endsWith(item?.key?.toString()));

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
              selectedKeys={currentPage?.key ? [currentPage?.key as string] : []}
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
