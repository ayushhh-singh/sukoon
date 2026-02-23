import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AuthStack from './AuthStack';
import PatientTabs from './PatientTabs';
import TherapistTabs from './TherapistTabs';

export default function RootNavigator() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const { c, theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bgPrimary }}>
        <ActivityIndicator size="large" color={c.accentPrimary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: theme === 'dark',
        colors: {
          primary: c.accentPrimary,
          background: c.bgPrimary,
          card: c.bgCard,
          text: c.textPrimary,
          border: c.border,
          notification: c.rose,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      {!isAuthenticated ? (
        <AuthStack />
      ) : role === 'patient' ? (
        <PatientTabs />
      ) : (
        <TherapistTabs />
      )}
    </NavigationContainer>
  );
}
