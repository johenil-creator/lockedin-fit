import { useRef, useEffect, useCallback, useMemo } from "react";
import { StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useAppTheme } from "../contexts/ThemeContext";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  enableDynamicSizing?: boolean;
  scrollable?: boolean;
};

export function AppBottomSheet({
  visible,
  onClose,
  children,
  snapPoints: userSnapPoints,
  enableDynamicSizing = true,
  scrollable = false,
}: Props) {
  const { theme } = useAppTheme();
  const ref = useRef<BottomSheet>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  // Dynamic sizing and explicit snap points are mutually exclusive in
  // gorhom/bottom-sheet. Pick one based on whether the caller provided snaps.
  const useDynamic = !userSnapPoints && enableDynamicSizing;
  const snapPoints = useMemo(
    () => (useDynamic ? undefined : (userSnapPoints ?? ["90%"])),
    [userSnapPoints, useDynamic]
  );

  useEffect(() => {
    if (visible) {
      // Use setTimeout instead of requestAnimationFrame — the BottomSheet
      // needs a full layout pass before expand() works, especially when the
      // component is freshly mounted with visible=true.
      const id = setTimeout(() => {
        ref.current?.expand();
      }, 50);
      return () => clearTimeout(id);
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
      enableDynamicSizing={useDynamic}
      enablePanDownToClose
      onClose={handleSheetClose}
      backdropComponent={renderBackdrop}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={[styles.background, { backgroundColor: theme.colors.surface }]}
      handleIndicatorStyle={{ backgroundColor: theme.colors.muted }}
    >
      {scrollable ? (
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={styles.content}>
          {children}
        </BottomSheetView>
      )}
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
