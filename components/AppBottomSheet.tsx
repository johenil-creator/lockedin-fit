import { useRef, useEffect, useCallback, useMemo } from "react";
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
  snapPoints: userSnapPoints,
  enableDynamicSizing = true,
}: Props) {
  const { theme } = useAppTheme();
  const ref = useRef<BottomSheet>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  // When using dynamic sizing (no explicit snap points), provide a max snap
  // point so keyboardBehavior="extend" has a position to expand into.
  const snapPoints = useMemo(
    () => userSnapPoints ?? ["90%"],
    [userSnapPoints]
  );

  useEffect(() => {
    if (visible) {
      ref.current?.expand();
    } else {
      ref.current?.close();
    }
  }, [visible]);

  const handleSheetClose = useCallback(() => {
    // Only notify parent for gesture/backdrop closes (where visible is still true).
    // Skip for programmatic closes — parent already set visible to false.
    if (visibleRef.current) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
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
      enableDynamicSizing={!userSnapPoints && enableDynamicSizing}
      enablePanDownToClose
      onClose={handleSheetClose}
      backdropComponent={renderBackdrop}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
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
