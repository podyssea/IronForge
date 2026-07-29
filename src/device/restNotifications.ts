import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function scheduleRestNotification(seconds: number, exerciseName: string): Promise<string | null> {
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Rest complete",
      body: `${exerciseName}: your next set is ready.`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
}

export async function cancelRestNotification(identifier: string | null): Promise<void> {
  if (identifier) await Notifications.cancelScheduledNotificationAsync(identifier);
}
