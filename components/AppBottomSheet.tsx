import { useRef, useEffect, useCallback } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { useAppTheme } from "../contexts/ThemeContext";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  enableDynamicSizing?: boolean;
};

export function AppBottomSheet({
  visible,
  onClose,
  children,
  snapPoints,
  enableDynamicSizing = true,
}: Props) {
  const { theme } = useAppTheme();
  const ref = useRef<BottomSheet>(null);

  useEffect(() => {
    if (visible) {
      ref.current?.expand();
    } else {
      ref.current?.close();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints && enableDynamicSizing}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={[styles.background, { backgroundColor: theme.colors.surface }]}
      handleIndicatorStyle={{ backgroundColor: theme.colors.muted }}
    >
      <BottomSheetView style={styles.content}>
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
});
