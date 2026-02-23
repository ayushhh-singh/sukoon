import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MessageCircle, Clock, BookOpen, Dumbbell, Settings } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import SessionsScreen from '../screens/patient/SessionsScreen';
import HistoryScreen from '../screens/patient/HistoryScreen';
import JournalScreen from '../screens/patient/JournalScreen';
import ExercisesScreen from '../screens/patient/ExercisesScreen';
import SettingsScreen from '../screens/patient/SettingsScreen';

export type PatientTabParamList = {
  Sessions: undefined;
  History: undefined;
  Journal: undefined;
  Exercises: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<PatientTabParamList>();

export default function PatientTabs() {
  const { c } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accentPrimary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBarBorder,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Sessions"
        component={SessionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Journal"
        component={JournalScreen}
        options={{
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Exercises"
        component={ExercisesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Dumbbell size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
