import {useEffect, useState} from 'react';

export interface TerminalSize {
  columns: number;
  rows: number;
}

const readSize = (): TerminalSize => ({
  columns: process.stdout.columns || 80,
  rows: process.stdout.rows || 24,
});

export const useTerminalSize = (): TerminalSize => {
  const [size, setSize] = useState(readSize);

  useEffect(() => {
    const update = (): void => setSize(readSize());
    process.stdout.on('resize', update);
    return () => {
      process.stdout.off('resize', update);
    };
  }, []);

  return size;
};
