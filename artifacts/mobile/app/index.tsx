import { useColors } from '@/hooks/useColors';
import { useAuth, useUser } from '@clerk/expo';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function HomeRoute() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();

  if (!isLoaded || (isSignedIn && !isUserLoaded)) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const metadata = user?.unsafeMetadata ?? {};
  const hasProfileDetails = Boolean(
    (metadata.firstName ?? user?.firstName) &&
      (metadata.lastName ?? user?.lastName) &&
      metadata.dateOfBirth,
  );
  if (isSignedIn && !hasProfileDetails) {
    return <Redirect href="/(auth)/complete-profile" />;
  }

  return (
    <Redirect
      href={isSignedIn ? '/(protected)' : '/(auth)/sign-in'}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
