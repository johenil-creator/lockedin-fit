import { Alert } from "react-native";

/**
 * Show a native alert confirmation dialog for blocking a user.
 *
 * @param username  The display name of the user to block
 * @param onConfirm Called when the user taps "Block"
 */
export function showBlockConfirmation(
  username: string,
  onConfirm: () => void
): void {
  Alert.alert(
    `Block ${username}?`,
    "They won't be able to see your posts or send you messages. " +
      "Their content will be hidden from your feed. You can unblock them later in Settings.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: onConfirm,
      },
    ]
  );
}

/**
 * Show a native alert confirmation dialog for unblocking a user.
 *
 * @param username  The display name of the user to unblock
 * @param onConfirm Called when the user taps "Unblock"
 */
export function showUnblockConfirmation(
  username: string,
  onConfirm: () => void
): void {
  Alert.alert(
    `Unblock ${username}?`,
    "They will be able to see your posts and send you messages again.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        onPress: onConfirm,
      },
    ]
  );
}
