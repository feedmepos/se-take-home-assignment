import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ButtonProps {
  label: string;
  isFocused?: boolean;
  onSelect: () => void;
  hotkey: string;
}

export function Button({ label, isFocused = false, onSelect, hotkey }: ButtonProps) {
  return (
    <Box borderStyle={isFocused ? 'round' : 'single'} borderColor={isFocused ? 'cyan' : 'gray'} paddingX={1} paddingY={0}>
      <Text color={isFocused ? 'cyan' : 'white'}>
        {label} <Text dimColor>({hotkey})</Text>
      </Text>
    </Box>
  );
}
