import {
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ResponsivePageProps = ScrollViewProps;

export function ResponsivePage({
  contentContainerStyle,
  ...props
}: ResponsivePageProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      {...props}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 12) + 4 },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 118,
  },
});
