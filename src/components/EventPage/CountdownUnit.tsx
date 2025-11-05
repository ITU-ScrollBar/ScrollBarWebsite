import React from 'react';
import Text from 'antd/es/typography/Text';

interface CountdownUnitProps {
  label: string;
  value: string;
  isMobile: boolean;
}

const flexCenter = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
};

const CountdownUnit: React.FC<CountdownUnitProps> = ({ label, value, isMobile }) => (
  <div style={flexCenter}>
    <div
      style={{
        ...flexCenter,
        justifyContent: 'center',
        width: isMobile ? '55px' : '70px',
        height: isMobile ? '50px' : '60px',
        backgroundColor: 'rgb(46, 46, 46)',
        borderRadius: 8,
        padding: 4,
      }}
    >
      <Text
        style={{
          color: 'yellow',
          lineHeight: 1,
          fontSize: isMobile ? 18 : 20,
          fontWeight: 'bold',
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: 'yellow',
          lineHeight: 1,
          fontSize: isMobile ? 10 : 12,
          fontWeight: 'normal',
          margin: '2px 0 0 0',
        }}
      >
        {label}
      </Text>
    </div>
  </div>
);

export default CountdownUnit;
