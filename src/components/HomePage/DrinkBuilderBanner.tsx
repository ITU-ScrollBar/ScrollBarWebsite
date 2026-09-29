import { Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useWindowSize } from '../../hooks/useWindowSize'

// Temporary promotion for the drink builder competition. Remove together with /forms/drinks.
export default function DrinkBuilderBanner() {
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto 48px',
        padding: isMobile ? '24px 20px' : '28px 36px',
        borderRadius: 16,
        background: '#202020',
        color: '#fff',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: isMobile ? 16 : 32,
        borderLeft: '8px solid #FFE600',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: isMobile ? 40 : 56, lineHeight: 1 }}>
        🍹
      </span>
      <div style={{ flex: 1 }}>
        <h2 style={{ color: '#FFE600', margin: '0 0 8px', fontSize: isMobile ? 22 : 28 }}>
          Build a drink for our advent calendar
        </h2>
        <p style={{ margin: 0, fontSize: 16, lineHeight: '26px', color: 'rgba(255, 255, 255, 0.85)' }}>
          Mix your own drink from what we have in the bar. It could end up in ScrollBar's advent
          calendar, and it might even be served at a Friday bar.
        </p>
      </div>
      <Button
        size="large"
        onClick={() => navigate('/forms/drinks')}
        style={{
          background: '#FFE600',
          borderColor: '#FFE600',
          color: '#202020',
          fontWeight: 700,
          flex: 'none',
        }}
      >
        Build a drink
      </Button>
    </div>
  )
}
