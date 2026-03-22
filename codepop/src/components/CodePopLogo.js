import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export function CodePopLogo({ size = 64 }) {
  const s = size / 64; // scale factor
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {/* "code" with straw */}
      <View style={{ position: "relative" }}>
        <Text style={{
          fontSize: size,
          color: "#222831",
          fontWeight: "600",
          letterSpacing: -1,
        }}>code</Text>
        <Svg
          width={50 * s}
          height={90 * s}
          style={{ position: "absolute", left: 30 * s, top: -15 * s }}
        >
          <Path
            d={`M ${20*s} ${85*s} L ${28*s} ${28*s} L ${18*s} ${34*s}`}
            stroke="#08D9D6"
            strokeWidth={4 * s}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      {/* "pop" with bubbles */}
      <View style={{ position: "relative" }}>
        <Text style={{
          fontSize: size,
          color: "#08D9D6",
          fontWeight: "600",
          fontStyle: "italic",
          letterSpacing: -1,
        }}>pop</Text>
        <View style={{
          position: "absolute",
          width: 14 * s, height: 14 * s,
          borderRadius: 7 * s,
          borderWidth: 3, borderColor: "#08D9D6",
          top: 5 * s, left: 52 * s,
        }} />
        <View style={{
          position: "absolute",
          width: 10 * s, height: 10 * s,
          borderRadius: 5 * s,
          borderWidth: 2, borderColor: "#08D9D6",
          top: -8 * s, left: 62 * s,
        }} />
      </View>
    </View>
  );
}

export default CodePopLogo;
