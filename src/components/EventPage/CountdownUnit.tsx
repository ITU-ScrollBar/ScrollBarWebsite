import React from 'react';
import Text from 'antd/es/typography/Text';
import { COLORS } from '../../constants/colors';
import { COMMON_STYLES } from '../../constants/styles';

interface CountdownUnitProps {
  label: string;
  value: string;
  isMobile: boolean;
}

const CountdownUnit: React.FC<CountdownUnitProps> = ({ label, value, isMobile }) => (
  <div style={COMMON_STYLES.flexCenter}>
    <div
      style={{
        ...COMMON_STYLES.flexCenterJustify,
        width: isMobile ? '55px' : '70px',
        height: isMobile ? '50px' : '60px',
        backgroundColor: COLORS.darkGray,
        borderRadius: 8,
        padding: 4,
      }}
    >
      <Text
        style={{
          ...COMMON_STYLES.textYellow,
          fontSize: isMobile ? 18 : 20,
          fontWeight: 'bold',
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          ...COMMON_STYLES.textYellow,
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
