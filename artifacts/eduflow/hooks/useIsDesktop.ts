import { useWindowDimensions } from "react-native";

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= 768;
}
